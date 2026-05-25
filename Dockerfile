# ── Build Stage ────────────────────────────────────────────────────────────────
FROM node:18-slim

# Instalar dependências nativas necessárias para sqlite3 (caso seja usado localmente)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar manifests primeiro para cache de dependências
COPY package*.json ./

# Instalar somente dependências de produção
RUN npm ci --omit=dev

# Copiar todo o código
COPY . .

# Porta que o Cloud Run vai expor
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

# Comando de start
CMD ["node", "server.js"]
