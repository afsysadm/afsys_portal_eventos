import type { Evento, StatusEvento } from '../types';
import { MOCK_EVENTOS } from '../data/mock';

// ---------------------------------------------------------------------------
// CAMADA DE SERVIÇO — EVENTOS
// Hoje retorna dados mock. Na fase de integração, troque o corpo destas
// funções por chamadas `fetch` aos endpoints públicos do módulo, por exemplo:
//
//   const base = getApiBase();           // resolvido pelo tenant/hostname
//   const res = await fetch(`${base}/afsys_inscricoes/public/eventos`);
//   return await res.json();
//
// A assinatura (Promise<Evento[]>) já é assíncrona de propósito, para que a
// troca não exija mudanças nos componentes.
// ---------------------------------------------------------------------------

const FAKE_DELAY = 250;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), FAKE_DELAY));
}

export async function getEventos(): Promise<Evento[]> {
  return delay(MOCK_EVENTOS);
}

export async function getEvento(slug: string): Promise<Evento | null> {
  const evento = MOCK_EVENTOS.find((e) => e.slug === slug) ?? null;
  return delay(evento);
}

// Agrupa os eventos por status, na ordem de exibição do portal.
export function agruparPorStatus(eventos: Evento[]): Record<StatusEvento, Evento[]> {
  return {
    aberto: eventos.filter((e) => e.status === 'aberto'),
    em_breve: eventos.filter((e) => e.status === 'em_breve'),
    encerrado: eventos.filter((e) => e.status === 'encerrado'),
  };
}
