# ---- deps: install once, cached unless package*.json changes ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- build: compile TypeScript + generate the Prisma client ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime: slim image, only what's needed to run the compiled server ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S parkflow && adduser -S parkflow -G parkflow
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npx prisma generate
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
USER parkflow
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
