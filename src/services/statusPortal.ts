import { apiBase } from '../config';

// ---------------------------------------------------------------------------
// SERVIÇO — STATUS DO PORTAL (janela de inscrições)
//
// Único dado que vem do backend nesta fase: o `status_portal` de cada evento.
// Todo o conteúdo (títulos, textos, resumo, passos) continua em src/data/, por
// tenant. A base da API também é do tenant resolvido (config.ts → apiBase()).
//
// GET publico/eventos →
//   { ok: true, eventos: [{ slug, status_portal: 'aberto' | 'encerrado' | 'em_breve', … }] }
//
// A resposta é buscada UMA vez por sessão de página e reaproveitada (a home
// renderiza vários cards; não faz sentido um fetch por card).
//
// Falha de rede/API fora do ar NÃO pode travar o portal: nesse caso o mapa vem
// vazio e o front trata como aberto — o backend segue sendo a autoridade e
// recusa o submit com `inscricoes_encerradas` se estiver fora do prazo.
// ---------------------------------------------------------------------------

export type StatusPortal = 'aberto' | 'em_breve' | 'encerrado';

// slug -> status_portal (só os eventos que o backend conhece)
export type StatusPortalMap = Record<string, string>;

// Tempo máximo de espera pela API: passado isso, o portal segue liberado.
const TIMEOUT_MS = 6000;

let cache: Promise<StatusPortalMap> | null = null;

interface EventoApi {
  slug?: string;
  status_portal?: string;
}

async function buscar(): Promise<StatusPortalMap> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBase()}/afsys_inscricoes/publico/eventos`, {
      signal: ctrl.signal,
    });
    const data: { ok?: boolean; eventos?: EventoApi[] } = await res.json();
    if (!data.ok || !Array.isArray(data.eventos)) return {};

    const mapa: StatusPortalMap = {};
    for (const ev of data.eventos) {
      if (ev && typeof ev.slug === 'string' && ev.slug) {
        mapa[ev.slug] = String(ev.status_portal ?? '');
      }
    }
    return mapa;
  } catch {
    // Sem rede, CORS, JSON inválido, timeout… → portal segue liberado.
    return {};
  } finally {
    clearTimeout(timer);
  }
}

// Mapa slug -> status_portal. Uma única chamada, reaproveitada por todos os
// componentes (a promise é memorizada, inclusive enquanto está em voo).
export function getStatusPortal(): Promise<StatusPortalMap> {
  if (!cache) cache = buscar();
  return cache;
}

// Regra única de leitura do status: só `aberto` permite inscrição.
// Slug desconhecido pelo backend (ou API indisponível) => não bloqueia.
export function permiteInscricao(mapa: StatusPortalMap, slug: string): boolean {
  const status = mapa[slug];
  return status === undefined ? true : status === 'aberto';
}

// Atalho para quem precisa do status de um único evento.
export async function inscricoesAbertas(slug: string): Promise<boolean> {
  return permiteInscricao(await getStatusPortal(), slug);
}
