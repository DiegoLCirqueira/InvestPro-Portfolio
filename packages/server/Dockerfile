FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/server/prisma packages/server/prisma

RUN npm install

COPY packages/shared packages/shared
COPY packages/server packages/server

WORKDIR /app/packages/server
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/server ./packages/server
COPY --from=build /app/packages/shared ./packages/shared

EXPOSE 3001
WORKDIR /app/packages/server
CMD ["node", "dist/index.js"]