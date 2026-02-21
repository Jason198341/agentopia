FROM node:22-slim

WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Worker dependencies
COPY worker/package.json worker/package-lock.json* ./worker/
RUN cd worker && npm ci --omit=dev

# Shared source code (battle engine, types, data, AI)
COPY src/lib/ ./src/lib/
COPY src/types/ ./src/types/
COPY src/data/ ./src/data/

# Worker source
COPY worker/ ./worker/

WORKDIR /app/worker

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8080/health || exit 1

CMD ["npx", "tsx", "src/index.ts"]
