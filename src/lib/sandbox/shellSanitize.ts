/**
 * Утилиты для безопасной передачи данных в shell-команды.
 * Предотвращают command injection.
 */

/** Валидация ID среды (буквы, цифры, подчёркивания, дефисы) */
export function validateEnvId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    throw new Error(`Invalid environment ID: ${id}. Only alphanumeric, underscore, hyphen, max 64 chars.`);
  }
  return id;
}

/** Валидация имени переменной окружения (запрещает критические переменные) */
export function validateEnvName(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Invalid env variable name: ${name}. Must match [A-Za-z_][A-Za-z0-9_]*`);
  }
  // Blacklist критических переменных, которые могут позволить escape из sandbox
  const blocked = ['LD_PRELOAD', 'LD_LIBRARY_PATH', 'LD_AUDIT', 'LD_DEBUG', 'LD_ORIGIN_ID',
    'IFS', 'SHELLOPTS', 'BASH_ENV', 'ENV', 'PROMPT_COMMAND', 'BASH_FUNC_', 'NIS_PATH',
    'PYTHONPATH', 'NODE_PATH', 'CLASSPATH', 'RUBYLIB', 'PERL5LIB', 'MALLOC_CHECK_',
    'HOME', 'SHELL', 'TMPDIR', 'HOSTNAME'];
  const upper = name.toUpperCase();
  for (const blocked_name of blocked) {
    if (upper === blocked_name || upper.startsWith(blocked_name)) {
      throw new Error(`Setting ${name} is not allowed for security reasons`);
    }
  }
  return name;
}

/** Валидация пути файла (внутри sandbox) — запрещает path traversal через .. */
export function validateSandboxPath(path: string): string {
  if (!/^\/[a-zA-Z0-9_/.-]+$/.test(path) || path.includes('..')) {
    throw new Error(`Invalid sandbox path: ${path}. No '..' allowed. Must start with / and contain only alphanumeric, underscore, hyphen, dot, slash.`);
  }
  return path;
}

/** Валидация PID (только цифры) */
export function validatePid(pid: string): string {
  const cleaned = pid.replace(/^proc_/, '');
  if (!/^\d+$/.test(cleaned)) {
    throw new Error(`Invalid process ID: ${pid}. Must be numeric.`);
  }
  return cleaned;
}

/** Валидация алгоритма хеширования */
export function validateHashAlgorithm(algo: string): string {
  const allowed = ['md5', 'sha1', 'sha224', 'sha256', 'sha384', 'sha512'];
  if (!allowed.includes(algo)) {
    throw new Error(`Invalid hash algorithm: ${algo}. Allowed: ${allowed.join(', ')}`);
  }
  return algo;
}

/** Валидация cwd (должен начинаться с /workspace или /) — запрещает .. */
export function validateCwd(cwd: string): string {
  if (!/^\/[a-zA-Z0-9_/.-]+$/.test(cwd) || cwd.includes('..')) {
    throw new Error(`Invalid working directory: ${cwd}. No '..' allowed.`);
  }
  return cwd;
}

/** Валидация timeout (1-300 секунд для обычных, до 3600 для daemon) */
export function validateTimeout(timeout: number, max = 300): number {
  const t = Math.floor(timeout);
  if (isNaN(t) || !isFinite(t)) return 30; // fallback при NaN/Infinity
  return Math.max(1, Math.min(max, t));
}

/** Валидация count (целое число в диапазоне) */
export function validateCount(count: number, min = 1, max = 100): number {
  return Math.max(min, Math.min(max, Math.floor(count) || min));
}

/** Экранирование строки для одинарных кавычек в shell. Возвращает строку УЖЕ в одинарных кавычках. */
export function shellEscapeSingle(str: string): string {
  const cleaned = str.replace(/\0/g, ''); // Удалить null bytes
  return "'" + cleaned.replace(/'/g, "'\\''") + "'";
}

/** Экранирование строки для двойных кавычек в shell. Возвращает строку УЖЕ в двойных кавычках. */
export function shellEscapeDouble(str: string): string {
  // СНАЧАЛА экранируем бэкслеши, ПОТОМ всё остальное (порядок критичен!)
  let cleaned = str.replace(/\0/g, '');
  cleaned = cleaned.replace(/\\/g, '\\\\');  // \ → \\ (ПЕРВЫМ!)
  cleaned = cleaned.replace(/"/g, '\\"');    // " → \"
  cleaned = cleaned.replace(/\$/g, '\\$');  // $ → \$
  cleaned = cleaned.replace(/`/g, '\\`');   // ` → \`
  cleaned = cleaned.replace(/\n/g, '\\n');  // newline → \n (ПОСЛЕ бэкслеша!)
  cleaned = cleaned.replace(/\r/g, '\\r');  // CR → \r
  return '"' + cleaned + '"';
}

/** Валидация имени пакета для apt/pip (запрещает .. и URL-подобные строки) */
export function validatePackageName(name: string): string {
  if (!/^[a-zA-Z0-9@._/+-]+$/.test(name) || name.includes('..') || /[:\\]/.test(name)) {
    throw new Error(`Invalid package name: ${name}`);
  }
  // Запретить URL-подобные строки
  if (/^(https?|ftp|ssh):/.test(name)) {
    throw new Error(`URL-like package name not allowed: ${name}`);
  }
  return name;
}

/** Валидация URL (только http/https, запрет private IP, защита от SSRF-байпасов) */
export function validateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Only http/https URLs allowed, got: ${parsed.protocol}`);
    }
    const hostname = parsed.hostname;

    // Запрет decimal/octal/hex IP представлений (SSRF bypass)
    if (/^\d+$/.test(hostname) || /^0[xX]/.test(hostname) || /^0[0-7]/.test(hostname)) {
      throw new Error(`Numeric IP representations not allowed: ${hostname}`);
    }

    // Запрет IPv6 private ranges
    if (hostname.includes(':')) {
      const lower = hostname.toLowerCase();
      // Unspecified address (:: = 0:0:0:0:0:0:0:0 = 0.0.0.0)
      if (lower === '::' || lower === '::0') {
        throw new Error(`Unspecified IPv6 address not allowed: ${hostname}`);
      }
      // Loopback
      if (lower === '::1') {
        throw new Error(`Private/local IPv6 not allowed: ${hostname}`);
      }
      // Unique local (fc00::/7) — начинается с fc или fd
      if (/^f[cd]/.test(lower)) {
        throw new Error(`Private/local IPv6 not allowed: ${hostname}`);
      }
      // Link-local (fe80::/10) — fe8x-febx
      if (/^fe[89ab]/.test(lower)) {
        throw new Error(`Link-local IPv6 not allowed: ${hostname}`);
      }
      // IPv4-mapped IPv6 — проверить оба формата (::ffff:X.X.X.X и полная форма)
      const ffffMatch = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/) ||
                        lower.match(/0:0:0:0:0:ffff:(\d+\.\d+\.\d+\.\d+)/);
      if (ffffMatch) {
        const ipv4 = ffffMatch[1];
        if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.)/.test(ipv4)) {
          throw new Error(`Private/local IPv4-mapped IPv6 not allowed: ${hostname}`);
        }
      }
      // ::ffff:0:0 (0.0.0.0)
      if (lower.includes('ffff:0:0') || lower === '::ffff:0:0') {
        throw new Error(`Private/local IPv6 not allowed: ${hostname}`);
      }
    }

    // Запрет IPv4 private IP ranges
    if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.)/.test(hostname)) {
      throw new Error(`Private/local IP not allowed: ${hostname}`);
    }

    return url;
  } catch (e: any) {
    if (e.message.includes('Private') || e.message.includes('Only') || e.message.includes('Numeric') || e.message.includes('Link-local')) throw e;
    throw new Error(`Invalid URL`);
  }
}

/** Валидация кода языка (ISO 639-1 + опционально страна, или 'auto') */
export function validateLanguageCode(code: string): string {
  if (code === 'auto') return code;
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(code)) {
    throw new Error(`Invalid language code: ${code}. Expected format: xx, xx-XX, or 'auto'`);
  }
  return code;
}