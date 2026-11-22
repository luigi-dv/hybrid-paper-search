FROM node:24-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

EXPOSE 3000

# tsx runs the TypeScript files directly, the same way as `npm run dev`.
# The settings come from the environment (see docker-compose.yml), not from .env.
CMD ["npx", "tsx", "src/server.ts"]
