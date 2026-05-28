import { execShell, getWorkspacePath, initSandbox, getNativeLibraryDir } from './nativeShell';
import { validateEnvId, validateSandboxPath, shellEscapeDouble } from './shellSanitize';
import type { SandboxExecResult, EnvironmentState, EnvironmentStatus } from '@/src/types';

export class SandboxManager {
  private workspacePath: string = '';
  private nativeLibraryDir: string = '';
  private activeEnvironment: string | null = null;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.workspacePath) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.workspacePath = await initSandbox();
        this.nativeLibraryDir = await getNativeLibraryDir();
      } catch {
        try {
          this.workspacePath = await getWorkspacePath();
          this.nativeLibraryDir = await getNativeLibraryDir();
        } catch {
          this.initPromise = null; // Позволить повторную попытку
          throw new Error('Failed to initialize sandbox: both initSandbox and getWorkspacePath failed');
        }
      }
    })();

    return this.initPromise;
  }

  private ensureInitialized(): void {
    if (!this.workspacePath) {
      throw new Error('SandboxManager not initialized. Call initialize() first.');
    }
  }

  private buildProotCommand(conversationId: string, command: string, cwd: string): string {
    const envDir = `${this.workspacePath}/environments/${conversationId}`;
    const rootfsDir = `${this.workspacePath}/rootfs`;
    const packagesDir = `${this.workspacePath}/packages`;
    const prootPath = `${this.nativeLibraryDir}/libproot.so`;
    const loaderPath = `${this.nativeLibraryDir}/libproot_loader.so`;
    const loader32Path = `${this.nativeLibraryDir}/libproot_loader32.so`;

    return [
      `PROOT_LOADER=${loaderPath}`,
      `PROOT_LOADER_32=${loader32Path}`,
      `PROOT_TMP_DIR=${envDir}/tmp`,
      prootPath,
      '-r', rootfsDir,
      '-b', `${packagesDir}/usr:/usr`,
      '-b', `${envDir}/home:/home`,
      '-b', `${envDir}/workspace:/workspace`,
      '-b', `${envDir}/inbox:/inbox`,
      '-b', `${envDir}/outbox:/outbox`,
      '-b', `${envDir}/tmp:/tmp`,
      '-b', `${envDir}/var:/var`,
      '-b', '/dev',
      '-b', '/proc',
      '-b', '/sys',
      '-0',  // fake root
      'bash', '-c', `cd ${shellEscapeDouble(cwd)} && ${command}`,
    ].join(' ');
  }

  async createEnvironment(conversationId: string): Promise<EnvironmentState> {
    this.ensureInitialized();
    validateEnvId(conversationId);
    const envDir = `${this.workspacePath}/environments/${conversationId}`;
    const dirs = ['home/agent', 'workspace', 'inbox', 'outbox', 'tmp', 'var'];

    for (const dir of dirs) {
      await execShell(`mkdir -p ${envDir}/${dir}`);
    }

    return {
      conversationId,
      status: 'frozen',
      workspacePath: `${envDir}/workspace`,
      homePath: `${envDir}/home/agent`,
      inboxPath: `${envDir}/inbox`,
      outboxPath: `${envDir}/outbox`,
      tmpPath: `${envDir}/tmp`,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      diskUsageBytes: 0,
    };
  }

  async execInSandbox(
    command: string,
    cwd: string = '/workspace',
    timeout: number = 30
  ): Promise<SandboxExecResult> {
    this.ensureInitialized();
    const startTime = Date.now();
    console.log(`[SandboxManager.execInSandbox] ➡️  START command="${command.slice(0, 150)}" cwd="${cwd}" timeout=${timeout}`);

    // Используем активную среду или default
    const conversationId = this.activeEnvironment || 'default';
    
    // Гарантируем существование директорий среды перед запуском proot
    await this.createEnvironment(conversationId);

    console.log(`[SandboxManager.execInSandbox] ℹ️  Using environment="${conversationId}" workspacePath="${this.workspacePath}"`);
    const fullCommand = this.buildProotCommand(conversationId, command, cwd);
    console.log(`[SandboxManager.execInSandbox] ℹ️  Full proot command length=${fullCommand.length} preview="${fullCommand.slice(0, 200)}..."`);
    const result = await execShell(fullCommand, this.workspacePath, timeout);
    const duration = Date.now() - startTime;
    console.log(`[SandboxManager.execInSandbox] ✅ DONE exitCode=${result.exitCode} duration=${duration}ms stdoutLen=${result.stdout?.length || 0} stderrLen=${result.stderr?.length || 0}`);
    if (result.stderr && result.stderr.length > 0) {
      console.warn(`[SandboxManager.execInSandbox] ⚠️  stderr preview: ${result.stderr.slice(0, 200)}`);
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: duration,
    };
  }

  async listEnvironments(): Promise<EnvironmentState[]> {
    this.ensureInitialized();
    const envsDir = `${this.workspacePath}/environments`;
    try {
      const result = await execShell(`ls -1 ${envsDir}`);
      if (!result.stdout) return [];
      const names = result.stdout.trim().split('\n').filter(Boolean);
      const states: EnvironmentState[] = [];
      for (const name of names) {
        const diskUsage = await this.getDiskUsage(name);
        states.push({
          conversationId: name,
          status: this.activeEnvironment === name ? 'active' : 'frozen',
          workspacePath: `${envsDir}/${name}/workspace`,
          homePath: `${envsDir}/${name}/home/agent`,
          inboxPath: `${envsDir}/${name}/inbox`,
          outboxPath: `${envsDir}/${name}/outbox`,
          tmpPath: `${envsDir}/${name}/tmp`,
          createdAt: Date.now(),
          lastActiveAt: Date.now(),
          diskUsageBytes: diskUsage,
        });
      }
      return states;
    } catch {
      return [];
    }
  }

  getActiveEnvironment(): string | null {
    return this.activeEnvironment;
  }

  setActiveEnvironment(conversationId: string | null): void {
    this.activeEnvironment = conversationId;
  }

  async freezeEnvironment(conversationId: string): Promise<void> {
    if (this.activeEnvironment === conversationId) {
      this.activeEnvironment = null;
    }
    // Файлы остаются на диске
  }

  async deleteEnvironment(conversationId: string): Promise<void> {
    this.ensureInitialized();
    validateEnvId(conversationId);
    await this.freezeEnvironment(conversationId);
    const envDir = `${this.workspacePath}/environments/${conversationId}`;
    await execShell(`rm -rf ${shellEscapeDouble(envDir)}`);
  }

  async getDiskUsage(conversationId: string): Promise<number> {
    this.ensureInitialized();
    const envDir = `${this.workspacePath}/environments/${conversationId}`;
    try {
      const result = await execShell(`du -sb ${envDir} | cut -f1`);
      return parseInt(result.stdout.trim(), 10) || 0;
    } catch {
      return 0;
    }
  }

  async copyFileToInbox(conversationId: string, sourceUri: string, fileName: string): Promise<string> {
    this.ensureInitialized();
    // Валидация sourceUri — только пути внутри workspace (с path traversal защитой) или media content URI
    const isWorkspacePath = sourceUri.startsWith(this.workspacePath + '/') || sourceUri === this.workspacePath;
    const isMediaContent = sourceUri.startsWith('content://com.android.providers.media');
    if (!isWorkspacePath && !isMediaContent) {
      throw new Error(`Access denied: source path must be within workspace or a media content URI`);
    }
    // Дополнительная проверка path traversal для workspace путей
    if (isWorkspacePath && sourceUri.includes('..')) {
      throw new Error(`Access denied: path traversal detected in source URI`);
    }
    // Symlink traversal защита — резолвим реальный путь и проверяем, что он внутри workspace
    if (isWorkspacePath) {
      try {
        const realPath = await execShell(`readlink -f ${shellEscapeDouble(sourceUri)}`);
        const resolved = realPath.stdout.trim();
        if (!resolved.startsWith(this.workspacePath + '/') && resolved !== this.workspacePath) {
          throw new Error(`Access denied: symlink resolves outside workspace`);
        }
      } catch (e: any) {
        if (e.message?.includes('Access denied')) throw e;
        // readlink не найден или путь не существует — продолжаем, proot ограничит доступ
      }
    }
    validateEnvId(conversationId);
    const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const destPath = `${this.workspacePath}/environments/${conversationId}/inbox/${safeFileName}`;
    await execShell(`cp ${shellEscapeDouble(sourceUri)} ${shellEscapeDouble(destPath)}`);
    return destPath;
  }

  getWorkspacePathSync(): string {
    return this.workspacePath;
  }
}

// Singleton
export const sandboxManager = new SandboxManager();