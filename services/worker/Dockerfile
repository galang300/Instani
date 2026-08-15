# syntax=docker/dockerfile:1.7
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm config set audit false \
  && npm config set fund false
RUN --mount=type=cache,id=panganterkini-npm,target=/root/.npm,sharing=locked \
  npm ci --workspace @panganterkini/worker --include-workspace-root --prefer-offline
CMD ["npm", "--workspace", "@panganterkini/worker", "run", "start"]
