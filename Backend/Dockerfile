FROM node:24-slim AS build
ARG APP
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx nest build ${APP} && npm prune --omit=dev

FROM node:24-slim
ARG APP
ENV APP=${APP} NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
USER node
CMD ["sh", "-c", "node dist/apps/${APP}/main"]
