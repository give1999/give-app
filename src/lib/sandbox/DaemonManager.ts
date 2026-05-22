import type { DaemonTask, SandboxExecResult } from '@/src/types';
import { sandboxManager } from './SandboxManager';

const DAEMON_CONVERSATION_ID = '_daemon';
const MAX_DAEMONS = 10;

class DaemonManager {
  private tasks: Map<string, DaemonTask> = new Map();
  private isRunning = false;
  private initialized = false;
  private activeTaskAbort: { taskId: string; aborted: boolean } | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await sandboxManager.createEnvironment(DAEMON_CONVERSATION_ID);
      this.initialized = true;
    } catch (e) {
      console.warn('[DaemonManager] Failed to initialize daemon environment:', e);
    }
  }

  async submitTask(chatId: string, command: string): Promise<string> {
    console.log(`[DaemonManager.submitTask] ➡️  START chatId="${chatId}" command="${command.slice(0, 100)}"`);
    // Лимит на количество daemon-задач
    const activeCount = Array.from(this.tasks.values())
      .filter(t => t.status === 'pending' || t.status === 'running').length;
    if (activeCount >= MAX_DAEMONS) {
      console.error(`[DaemonManager.submitTask] ❌ MAX_DAEMONS reached: ${activeCount}/${MAX_DAEMONS}`);
      throw new Error(`Maximum ${MAX_DAEMONS} active daemon tasks allowed. Cancel existing tasks first.`);
    }
    console.log(`[DaemonManager.submitTask] ℹ️  Active tasks: ${activeCount}/${MAX_DAEMONS}`);
    // Криптографически стойкий ID вместо Math.random
    const randomPart = (() => {
      try {
        const bytes = new Uint8Array(4);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      } catch { return Date.now().toString(36); }
    })();
    const task: DaemonTask = {
      id: `task_${Date.now()}_${randomPart}`,
      chatId,
      command,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    console.log(`[DaemonManager.submitTask] ✅ CREATED taskId="${task.id}" totalTasks=${this.tasks.size}`);
    this.processQueue();

    return task.id;
  }

  private async processQueue(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // Цикл: обрабатываем pending задачи, затем проверяем новые
      let pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending');

      while (pending.length > 0) {
        for (const task of pending) {
          // Проверяем, не был ли отменён пока ждал в очереди
          if (task.status !== 'pending') continue;

          task.status = 'running';
          task.startedAt = Date.now();
          this.activeTaskAbort = { taskId: task.id, aborted: false };

          try {
            const result = await sandboxManager.execInSandbox(
              task.command,
              '/workspace',
              3600 // 1 час макс
            );

            // Проверяем, был ли процесс отменён во время выполнения
            if (this.activeTaskAbort?.aborted) {
              task.status = 'error';
              task.error = 'Отменено пользователем';
              task.finishedAt = Date.now();
            } else {
              task.status = 'completed';
              task.finishedAt = Date.now();
              task.result = result;
            }
          } catch (e: any) {
            // Если отменено — ошибка от таймаута/kill, помечаем как отменено
            if (this.activeTaskAbort?.aborted) {
              task.status = 'error';
              task.error = 'Отменено пользователем';
              task.finishedAt = Date.now();
            } else {
              task.status = 'error';
              task.finishedAt = Date.now();
              task.error = e?.message;
            }
          } finally {
            this.activeTaskAbort = null;
          }
        }

        // Проверяем, появились ли новые pending задачи
        pending = Array.from(this.tasks.values()).filter(t => t.status === 'pending');
      }

      // Автоочистка старых задач (более 100)
      if (this.tasks.size > 100) {
        this.clearCompleted();
      }
    } finally {
      this.isRunning = false;
    }
  }

  getTask(taskId: string): DaemonTask | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): DaemonTask[] {
    return Array.from(this.tasks.values());
  }

  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'pending') {
      // Задача ещё в очереди — просто меняем статус
      task.status = 'error';
      task.error = 'Отменено пользователем';
      task.finishedAt = Date.now();
      return true;
    }

    if (task.status === 'running') {
      // Задача выполняется — помечаем для прерывания
      task.status = 'error';
      task.error = 'Отменено пользователем';
      task.finishedAt = Date.now();
      if (this.activeTaskAbort && this.activeTaskAbort.taskId === taskId) {
        this.activeTaskAbort.aborted = true;
      }
      return true;
    }

    return false;
  }

  clearCompleted(): void {
    for (const [id, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'error') {
        this.tasks.delete(id);
      }
    }
  }
}

export const daemonManager = new DaemonManager();