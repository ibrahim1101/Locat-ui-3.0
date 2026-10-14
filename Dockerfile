FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY locat-ui-3.0/package*.json ./
RUN npm ci
COPY locat-ui-3.0/ ./
COPY LICENSE ./LICENSE
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /data && chown node:node /data
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/LICENSE ./LICENSE
USER node
ENV LOCAT_HOST=0.0.0.0 LOCAT_PORT=8787 LOCAT_DATABASE_FILE=/data/locat.sqlite LOCAT_STATIC_DIR=/app/dist
EXPOSE 8787
CMD ["node", "server/index.mjs"]
