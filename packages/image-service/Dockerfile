FROM oven/bun:1.4.3 AS bun
FROM mcr.microsoft.com/playwright:v1.64.1-noble AS build
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile && bun run build:packages
RUN OTEL_SDK_DISABLED=true bun run --cwd apps/vanilla build && bun run --cwd apps/vue build && bun run --cwd apps/foldkit build
RUN mkdir -p /runtime/packages/core /runtime/packages/image-service && cp -r packages/core/dist packages/core/package.json /runtime/packages/core/ && cp -r packages/image-service/dist packages/image-service/package.json /runtime/packages/image-service/ && bun build packages/image-service/src/container.ts --outfile /runtime/server.js --target bun --external effect --external playwright --external @flow/core
RUN printf '{"type":"module","dependencies":{"@flow/core":"file:./packages/core","@flow/image-service":"file:./packages/image-service","effect":"4.0.0","playwright":"1.64.1"},"overrides":{"@flow/core":"file:./packages/core"}}' > /runtime/package.json
RUN cd /runtime && bun install --production

FROM mcr.microsoft.com/playwright:v1.64.1-noble
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY --from=build /runtime ./
COPY --from=build /workspace/apps/vanilla/dist ./hosts/vanilla
COPY --from=build /workspace/apps/vue/dist ./hosts/vue
COPY --from=build /workspace/apps/foldkit/dist ./hosts/foldkit
EXPOSE 8080 8081 8082 8083
STOPSIGNAL SIGTERM
CMD ["bun", "server.js"]
