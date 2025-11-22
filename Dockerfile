# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./

# Install ALL dependencies (including dev)
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# -------------------------
# Production stage
# -------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Copy package files (optional but fine)
COPY package*.json ./

# ⛔ REMOVE this line:
# RUN npm ci --only=production

# ✅ INSTEAD copy node_modules from builder:
COPY --from=builder /app/node_modules ./node_modules

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared

# Copy frontend build (you already had this part)
RUN mkdir -p ./dist/server/public && \
    if [ -d "./dist/public" ] && [ "$(ls -A ./dist/public 2>/dev/null)" ]; then \
      cp -r ./dist/public ./dist/server/; \
    else \
      echo "Warning: dist/public not found or empty"; \
    fi

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["npm", "start"]
