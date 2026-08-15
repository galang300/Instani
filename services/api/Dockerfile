# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY . .
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set audit false \
  && npm config set fund false
RUN npm ci --workspace @panganterkini/api --include-workspace-root
RUN npm --workspace @panganterkini/api run prisma:generate \
  || npm --workspace @panganterkini/api run prisma:generate \
  || npm --workspace @panganterkini/api run prisma:generate
EXPOSE 4000
CMD ["npm", "--workspace", "@panganterkini/api", "run", "start"]
