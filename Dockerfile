# =============================================================================
# Stage 1: Builder
# Installs all dependencies (including devDependencies) and compiles the app.
# The builder output is copied to the runner stage; the builder itself is
# discarded, keeping the final image lean.
# =============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching.
COPY package.json package-lock.json ./

# Install ALL dependencies (including devDependencies) needed for the build.
RUN npm ci

# Copy the full source tree.
COPY . .

# Build the SvelteKit app using adapter-node.
# DATABASE_PATH is set to a temp path so the SvelteKit postbuild analyser can
# import server modules without crashing — the value is never used at runtime.
RUN DATABASE_PATH=/tmp/build.sqlite npm run build

# Compile create-user.ts to CJS for use in the runner stage (no tsx available there).
RUN node_modules/.bin/esbuild scripts/create-user.ts \
        --bundle \
        --platform=node \
        --format=esm \
        --outfile=scripts/create-user.js \
        --external:better-sqlite3 \
        --external:argon2

# =============================================================================
# Stage 2: Runner
# Minimal production image. Only the compiled build output and production
# dependencies are present. No source files. No devDependencies. No build tools.
# =============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Copy only what is needed to run the production server.
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Copy Drizzle migrations — required by migrate() at server startup.
# The migrations folder is NOT compiled into build/; it must be present at runtime.
COPY --from=builder /app/src/lib/server/db/migrations ./src/lib/server/db/migrations

# Copy the compiled create-user script for docker exec use (if it was compiled)
RUN mkdir -p scripts
COPY --from=builder /app/scripts/ ./scripts/

# Install only production dependencies.
# This rebuilds native modules (better-sqlite3, argon2) from source for Alpine Linux.
RUN npm ci --omit=dev

# Install sqlite3 CLI for the WAL-safe backup script.
RUN apk add --no-cache sqlite

# ── Security: non-root user ──────────────────────────────────────────────────
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Create the /data directory for the SQLite volume mount.
RUN mkdir -p /data && chown appuser:appgroup /data

# Switch to the non-root user.
USER appuser

# Declare the volume mount point for the SQLite database.
VOLUME ["/data"]

# ── Environment defaults ──────────────────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/db.sqlite

EXPOSE 3000

CMD ["node", "build/index.js"]
