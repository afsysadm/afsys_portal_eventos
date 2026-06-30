# ---------- Estágio 1: build ----------
# Compila o React/Vite. Node existe apenas aqui (não vai para a imagem final).
FROM node:20-alpine AS build
WORKDIR /app

# Instala dependências a partir do lockfile (cache eficiente)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código e gera o build estático em /app/dist
COPY . .
RUN npm run build

# ---------- Estágio 2: runtime ----------
# Apenas nginx servindo os arquivos estáticos. Imagem final pequena e sem Node.
FROM nginx:1.27-alpine AS runtime

# Config de SPA (todas as rotas caem no index.html)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build do estágio anterior
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
