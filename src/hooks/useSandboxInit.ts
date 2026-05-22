import { useEffect, useRef, useState } from 'react';
import { sandboxManager } from '@/src/lib/sandbox/SandboxManager';
import { daemonManager } from '@/src/lib/sandbox/DaemonManager';
import { isRootfsInstalled, installRootfs } from '@/src/lib/sandbox/rootfs';

export type SandboxInitStatus = 'loading' | 'downloading' | 'ready' | 'error' | 'skipped';

const MAX_RETRIES = 3;

export function useSandboxInit() {
  const [status, setStatus] = useState<SandboxInitStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function init() {
      try {
        await sandboxManager.initialize();
        const installed = await isRootfsInstalled();
        if (!installed) {
          if (!cancelled) setStatus('downloading');
          await installRootfs((p) => {
            if (!cancelled && mountedRef.current) setProgress(p);
          });
        }
        try {
          await daemonManager.initialize();
        } catch (daemonErr: any) {
          console.warn('[Sandbox] Daemon init failed:', daemonErr?.message);
        }
        if (!cancelled && mountedRef.current) {
          setStatus('ready');
        }
      } catch (e: any) {
        if (!cancelled && mountedRef.current) {
          setStatus('error');
          setError(e?.message || 'Неизвестная ошибка');
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, []);

  const skip = () => {
    if (mountedRef.current) setStatus('skipped');
  };

  const retry = () => {
    if (!mountedRef.current) return;
    if (retryCountRef.current >= MAX_RETRIES) {
      if (mountedRef.current) {
        setStatus('error');
        setError('Превышено максимальное число попыток инициализации. Устройство может быть несовместимо.');
      }
      return;
    }
    retryCountRef.current++;
    setStatus('loading');
    setError(null);
    setProgress(0);
    sandboxManager.initialize()
      .then(() => isRootfsInstalled())
      .then((installed) => {
        if (!mountedRef.current) return;
        if (!installed) {
          setStatus('downloading');
          return installRootfs((p) => {
            if (mountedRef.current) setProgress(p);
          });
        }
      })
      .then(() => {
        if (mountedRef.current) return daemonManager.initialize();
      })
      .then(() => {
        if (mountedRef.current) setStatus('ready');
      })
      .catch((e: any) => {
        if (mountedRef.current) {
          setStatus('error');
          setError(e?.message);
        }
      });
  };

  return { status, progress, error, skip, retry };
}