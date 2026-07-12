# syntax=docker/dockerfile:1.6

FROM oven/bun:1.1 AS build
WORKDIR /app
COPY package.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
RUN bun run build

FROM oven/bun:1.1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 8080
CMD ["bun", "run", "preview", "--host", "0.0.0.0", "--port", "8080"]
