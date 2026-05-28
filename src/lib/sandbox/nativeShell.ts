import { NativeModules } from 'react-native';

const { ShellModule } = NativeModules;

export interface NativeShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execShell(
  command: string,
  cwd?: string,
  timeout: number = 30
): Promise<NativeShellResult> {
  if (!ShellModule) {
    throw new Error('ShellModule не доступен. Возможно, запущено не на Android.');
  }
  console.log(`[nativeShell.execShell] ➡️  START command="${command.slice(0, 150)}" cwd="${cwd || 'null'}" timeout=${timeout}`);
  try {
    const result = await ShellModule.exec(command, cwd || null, timeout);
    console.log(`[nativeShell.execShell] ✅ DONE exitCode=${result.exitCode} stdoutLen=${result.stdout?.length || 0} stderrLen=${result.stderr?.length || 0}`);
    if (result.stderr && result.stderr.length > 0) {
      console.warn(`[nativeShell.execShell] ⚠️  stderr: ${result.stderr.slice(0, 200)}`);
    }
    return result;
  } catch (e: any) {
    console.error(`[nativeShell.execShell] ❌ ERROR: ${e.message}`);
    throw e;
  }
}

function normalizeAndroidPath(path: string): string {
  if (path && path.startsWith('/data/user/0/')) {
    return path.replace('/data/user/0/', '/data/data/');
  }
  return path;
}

export async function getWorkspacePath(): Promise<string> {
  if (!ShellModule) {
    throw new Error('ShellModule не доступен.');
  }
  const path = await ShellModule.getWorkspacePath();
  return normalizeAndroidPath(path);
}

export async function initSandbox(): Promise<string> {
  if (!ShellModule) {
    throw new Error('ShellModule не доступен.');
  }
  const path = await ShellModule.initSandbox();
  return normalizeAndroidPath(path);
}

export async function getNativeLibraryDir(): Promise<string> {
  if (!ShellModule) {
    throw new Error('ShellModule не доступен.');
  }
  return ShellModule.getNativeLibraryDir();
}