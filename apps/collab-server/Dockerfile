# Build from the repository root:
#   docker build -f apps/collab-server/Dockerfile -t openedit-collab .
# or simply: docker compose up

FROM node:20-bookworm AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/collab-server/package.json apps/collab-server/
RUN pnpm install --frozen-lockfile --filter @openedit/collab-server
COPY tsconfig.base.json ./
COPY apps/collab-server apps/collab-server
RUN pnpm --filter @openedit/collab-server build
# A standalone copy with production dependencies only.
RUN pnpm --filter @openedit/collab-server deploy --legacy --prod /out

FROM node:20-bookworm-slim
ENV NODE_ENV=production \
    PORT=1234 \
    DATABASE_PATH=/data/openedit.sqlite
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/dist ./dist
RUN mkdir /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 1234
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "dist/main.js"]
