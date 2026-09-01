import type { Evento, StatusEvento } from '../types';
import { getTenantData } from '../data';

// ---------------------------------------------------------------------------
// CAMADA DE SERVIÇO — EVENTOS
// Hoje retorna os dados do tenant resolvido (src/data). Na fase de integração,
// troque o corpo destas funções por chamadas `fetch` aos endpoints públicos do
// módulo, por exemplo:
//
//   const res = await fetch(`${apiBase()}/afsys_inscricoes/public/eventos`);
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
  return delay(getTenantData().eventos);
}

export async function getEvento(slug: string): Promise<Evento | null> {
  const evento = getTenantData().eventos.find((e) => e.slug === slug) ?? null;
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
