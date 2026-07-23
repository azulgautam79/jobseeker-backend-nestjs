# -------------------------
# Build Stage
# -------------------------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev


# -------------------------
# Runtime Stage
# -------------------------
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 7000

CMD ["node", "dist/main"]
