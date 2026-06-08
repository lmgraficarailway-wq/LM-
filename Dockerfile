# ── Build Stage ────────────────────────────────────────────────────────────────
FROM node:18-slim

WORKDIR /app

# Copiar manifests primeiro para cache de dependências
COPY package*.json ./

# Instalar somente dependências de produção (sem sqlite3 build tools - USE_SQLITE=false em produção)
RUN npm ci --omit=dev --ignore-scripts

# Copiar todo o código
COPY . .

# Porta que o Cloud Run vai expor
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Comando de start
CMD ["node", "server.js"]
