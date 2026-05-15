/** Expo Start Wrapper — предотвращает краш от undici ECONNRESET */

// Ловим uncaught exception от undici, чтобы процесс не падал
process.on('uncaughtException', (err) => {
  const msg = err?.message || '';
  const cause = err?.cause;
  if (msg === 'terminated' && cause?.code === 'ECONNRESET') {
    console.error('[expo-wrap] Игнорирую undici ECONNRESET abort (клиент телефона отключился)');
    return;
  }
  // Любая другая ошибка — пишем и убиваем процесс
  console.error('[expo-wrap] Необработанная ошибка:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  const msg = err?.message || '';
  const cause = (err as any)?.cause;
  if (msg === 'terminated' && cause?.code === 'ECONNRESET') {
    console.error('[expo-wrap] Игнорирую unhandled undici ECONNRESET');
    return;
  }
  console.error('[expo-wrap] Unhandled rejection:', reason);
});

const { spawn } = require('child_process');

const args = ['expo', 'start', '--lan', '--clear', ...process.argv.slice(2)];
console.log('[expo-wrap] Запуск:', 'npx', args.join(' '));

const proc = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

proc.on('exit', (code) => {
  process.exit(code ?? 0);
});
