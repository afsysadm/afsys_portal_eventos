# Portal de Eventos — AFSYS

Portal público de eventos e inscrições, **multi-cliente**: a mesma base de código
atende vários sindicatos, diferenciados pela URL. Front-end estático (React + Vite),
consumindo os endpoints públicos do módulo `afsys_inscricoes` (Perfex).

> **Status:** Fase 1 — home (portal) + página de detalhe do evento, com **dados mock**.
> O formulário de inscrição (wizard) e a integração com a API entram nas próximas fases.

## Stack

- React 18 + Vite 5 + TypeScript
- React Router (rotas `/` e `/evento/:slug`)
- Build estático servido por nginx (Docker multi-stage)

## Rodar localmente

```bash
npm install
npm run dev       # http://localhost:5173
```

Build de produção:

```bash
npm run build     # gera ./dist
npm run preview   # serve o ./dist localmente
```

## Estrutura

```
src/
├── types/            Tipos do domínio (Evento, SiteConfig, ...)
├── theme/palette.ts  Cores dos eventos + temas por cliente + applyTheme()
├── config/tenants.ts Tenants (marca, cores, apiBase) + resolução por hostname
├── config.ts         apiBase() do tenant + chave do Turnstile
├── data/             Dados POR TENANT (um arquivo por sindicato) + index.ts
│   ├── index.ts         TENANT_DATA (slug -> dados) e getTenantData()
│   ├── hoteleirorp.ts   EVENTOS + SITE_CONFIG
│   └── sindrefeicoessuzano.ts
├── services/         Camada de dados (TROCAR dados locais por API aqui)
│   ├── events.ts        getEventos(), getEvento(slug)
│   └── siteConfig.ts    getSiteConfig() do tenant resolvido
├── context/          SiteContext (tema) e ToastContext
├── hooks/useReveal   Animação de entrada ao rolar
├── components/       Nav, Footer, Aurora, Lineup, EventCard
├── pages/            HubPage (portal), EventPage (detalhe)
└── index.css         Estilos globais + variáveis de tema
```

## Multi-cliente (como funciona)

- `resolveTenant()` (em `config/tenants.ts`) resolve o sindicato pelo **hostname**,
  usando o mapa explícito `HOSTNAME_TENANT`. Hostname desconhecido (localhost, preview)
  cai no `DEFAULT_TENANT`.
- Marca, cores, contato e **base da API** (`apiBase`) vêm da entrada do tenant; a cor é
  aplicada em runtime como CSS custom properties por `applyTenantTheme()`.
- Eventos e textos da home vêm de `src/data/<slug>.ts`, via `getTenantData()`.

| Tenant | Portal | API (Perfex) |
|---|---|---|
| `hoteleirorp` | hoteleirosrp.afsys.com.br | https://hoteleirorp.gestao.afsys.com.br |
| `sindrefeicoessuzano` | sindrefeicoessuzano.afsys.com.br | https://sindrefeicoessuzano.gestao.afsys.com.br |

**Para adicionar um sindicato** (3 passos, sem refatorar nada):

1. Entrada em `TENANTS` e no mapa `HOSTNAME_TENANT` (`config/tenants.ts`).
2. Arquivo `src/data/<slug>.ts` exportando `EVENTOS` e `SITE_CONFIG`.
3. Linha em `TENANT_DATA` (`src/data/index.ts`) + a logo em `public/assets/`.

Também é preciso liberar o novo hostname no painel do Cloudflare Turnstile (a chave
do site é a mesma para todos os domínios).

## Integração com a API (próxima fase)

Trocar o corpo das funções em `services/events.ts` e `services/siteConfig.ts` por
chamadas `fetch` aos endpoints públicos do módulo (listar eventos, detalhe por slug,
config do site, e submit da inscrição protegido por Turnstile). As assinaturas já são
assíncronas para que a troca não afete componentes.

## Deploy no VPS (Docker + Traefik)

O `Dockerfile` é **multi-stage**: compila o site com Node e serve o resultado com
nginx — **não é preciso instalar Node no servidor**, apenas Docker.

```bash
# no VPS, dentro do repositório clonado:
docker build -t portal-eventos:latest .
```

Em seguida, suba como serviço no Swarm/Portainer conectado à rede do Traefik, com um
router apontando para o domínio do cliente (ex.: hoteleiros.afsys.com.br) e o
resolvedor de certificado Let's Encrypt já existente. A porta interna do container é a 80.

> Lembrete de ambiente: após adicionar o serviço à rede do Traefik no Swarm, pode ser
> necessário `docker service update --force <serviço>` para o Traefik reanunciar o router
> e o Let's Encrypt emitir o certificado.
