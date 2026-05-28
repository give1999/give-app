import { registerTool } from '../registry';
import type { Tool } from '../registry';
import * as FileSystem from 'expo-file-system/legacy';
import { useChatStore } from '@/src/stores/chatStore';

class MockSqlDb {
  private tables: Record<string, Array<Record<string, any>>> = {};
  
  load(jsonStr: string) {
    try {
      this.tables = JSON.parse(jsonStr);
    } catch {
      this.tables = {};
    }
  }
  
  save(): string {
    return JSON.stringify(this.tables, null, 2);
  }
  
  run(query: string): { columns: string[]; rows: any[][] } | string {
    const q = query.trim().replace(/;+$/, '');
    
    // 1. CREATE TABLE
    const createMatch = q.match(/CREATE\s+TABLE\s+(\w+)\s*\(([^)]+)\)/i);
    if (createMatch) {
      const tableName = createMatch[1].toLowerCase();
      if (!this.tables[tableName]) {
        this.tables[tableName] = [];
      }
      return `Table ${tableName} created.`;
    }
    
    // 2. INSERT INTO
    const insertMatch = q.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1].toLowerCase();
      if (!this.tables[tableName]) {
        this.tables[tableName] = [];
      }
      const cols = insertMatch[2].split(',').map(s => s.trim().toLowerCase());
      const vals = insertMatch[3].split(',').map(s => {
        let val = s.trim();
        if (val.startsWith("'") && val.endsWith("'")) return val.slice(1, -1);
        if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
        const num = Number(val);
        return isNaN(num) ? val : num;
      });
      
      const row: Record<string, any> = {};
      cols.forEach((col, idx) => {
        row[col] = vals[idx];
      });
      
      this.tables[tableName].push(row);
      return `1 row inserted.`;
    }
    
    // 3. SELECT
    const selectMatch = q.match(/SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (selectMatch) {
      const selectFields = selectMatch[1].split(',').map(s => s.trim().toLowerCase());
      const tableName = selectMatch[2].toLowerCase();
      const whereCond = selectMatch[3];
      
      const table = this.tables[tableName] || [];
      const rows: any[][] = [];
      let columns: string[] = [];
      
      if (table.length > 0) {
        columns = selectFields[0] === '*' ? Object.keys(table[0]) : selectFields;
      } else {
        columns = selectFields[0] === '*' ? ['id'] : selectFields;
      }
      
      for (const row of table) {
        if (whereCond) {
          const eqMatch = whereCond.match(/(\w+)\s*=\s*['"]?(.+?)['"]?$/i);
          if (eqMatch) {
            const col = eqMatch[1].toLowerCase();
            const val = eqMatch[2].trim();
            if (String(row[col]) !== String(val)) continue;
          }
        }
        
        const rowData = columns.map(col => row[col] ?? null);
        rows.push(rowData);
      }
      
      return { columns, rows };
    }
    
    return `Query executed successfully.`;
  }
}

const tool: Tool = {
  definition: {
    type: 'function',
    function: {
      name: 'code_run_sql',
      description: 'Выполнить SQL-запрос в песочнице. База данных создаётся автоматически.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL-запрос для выполнения',
          },
          database: {
            type: 'string',
            description: 'Путь к файлу БД (по умолчанию /workspace/data.db)',
            default: '/workspace/data.db',
          },
        },
        required: ['query'],
      },
    },
  },
  permission: 'safe',
  category: 'code',
  execute: async (args) => {
    const { sandboxManager } = require('@/src/lib/sandbox/SandboxManager');
    try {
      await sandboxManager.initialize();
      const workspacePath = sandboxManager.getWorkspacePathSync();
      const convId = sandboxManager.getActiveEnvironment() || useChatStore.getState().activeConversationId || 'default';
      
      let dbPath = (args.database as string) || '/workspace/data.db';
      if (dbPath.includes('/environments/')) {
        const idx = dbPath.indexOf('/environments/');
        const rest = dbPath.substring(idx + '/environments/'.length);
        const parts = rest.split('/');
        parts.shift();
        dbPath = '/' + parts.join('/');
      }
      let clean = dbPath.trim().replace(/^\/+/, '');
      let hostPath = '';
      const baseDir = (FileSystem.documentDirectory || '').replace(/\/$/, '') + '/sandbox';
      if (clean.startsWith('workspace/')) {
        hostPath = `${baseDir}/environments/${convId}/${clean}`;
      } else if (clean.startsWith('home/') || clean.startsWith('inbox/') || clean.startsWith('outbox/') || clean.startsWith('tmp/')) {
        hostPath = `${baseDir}/environments/${convId}/${clean}`;
      } else {
        hostPath = `${baseDir}/environments/${convId}/workspace/${clean}`;
      }
      
      const db = new MockSqlDb();
      const info = await FileSystem.getInfoAsync(hostPath);
      if (info.exists && !info.isDirectory) {
        const jsonStr = await FileSystem.readAsStringAsync(hostPath, { encoding: FileSystem.EncodingType.UTF8 });
        db.load(jsonStr);
      }
      
      const query = args.query as string;
      const queries = query.split(';').map(q => q.trim()).filter(Boolean);
      let lastResult: any = '';
      
      for (const q of queries) {
        lastResult = db.run(q);
      }
      
      const parentDir = hostPath.substring(0, hostPath.lastIndexOf('/'));
      await FileSystem.makeDirectoryAsync(parentDir, { intermediates: true });
      await FileSystem.writeAsStringAsync(hostPath, db.save(), { encoding: FileSystem.EncodingType.UTF8 });
      
      let stdout = '';
      if (typeof lastResult === 'object') {
        stdout = lastResult.columns.join(' | ') + '\n' +
          '-'.repeat(lastResult.columns.join(' | ').length) + '\n' +
          lastResult.rows.map(r => r.join(' | ')).join('\n');
      } else {
        stdout = String(lastResult);
      }
      
      return JSON.stringify({ stdout, exitCode: 0 });
    } catch (e: any) {
      return JSON.stringify({ error: e.message, exitCode: 1 });
    }
  },
};

registerTool(tool);