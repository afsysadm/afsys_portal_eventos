import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '../../config';

// Tipagem mínima da API global do Turnstile.
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar o Turnstile'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

// Renderiza o widget Turnstile e devolve o token via onVerify.
export function Turnstile({ onVerify, onExpire }: Props) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !holder.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onVerify(token),
          'expired-callback': () => onExpire && onExpire(),
          'error-callback': () => onExpire && onExpire(),
        });
      })
      .catch(() => {
        /* silencioso: se não carregar, o botão de enviar segue desabilitado */
      });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={holder} className="wz-turnstile" />;
}
