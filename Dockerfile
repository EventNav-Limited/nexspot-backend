# =============================================================
#
#  DEV IMAGE
#  For local development only. Run with docker compose up.
#  Never pushed to any registry or deployed anywhere.
#
# =============================================================
FROM node:24.15.0-bookworm-slim AS dev

WORKDIR /app

# NestJS doesn't need OpenSSL unless you're using Prisma —
# add it back if you add Prisma later
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Cache layer: only reinstall when package files change
COPY package*.json ./

# Install everything including @nestjs/cli and other devDeps
RUN npm ci

# nest start --watch needs this to know where src/dist live
# and which compiler options to use
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# src/ is mounted as a volume from the host (see docker-compose.dev.yml).
# The NestJS watcher picks up file changes automatically.
# Meaning that:
# Changes on your machine are reflected instantly inside the container
# without rebuilding the image.

# --debug makes Node listen on 9229 for the VS Code / chrome debugger
CMD ["npm", "run", "start:debug"]


# =============================================================
#
#  PRODUCTION BUILD
#
# =============================================================

# -------------------------------------------------------------
# STAGE 1: builder
# Does all the heavy lifting — installs deps, generates the
# Prisma client, and compiles TypeScript.
# Will NOT end up in the final image.
# -------------------------------------------------------------
FROM node:24.15.0-bookworm-slim AS builder

WORKDIR /app

# Install OpenSSL — required by Prisma to generate the client
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only package files first.
# Docker caches each layer — if package.json hasn't changed,
# it won't re-run npm ci on the next build. Big time saver.
COPY package*.json ./

# Install ALL dependencies including devDeps (we need tsc, ts-node, etc.)
RUN npm ci

# Copy prisma schema so we can generate the client
COPY prisma ./prisma
COPY prisma.config.ts ./

# Copy source so tsc can compile it
COPY src ./src
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# Generate the Prisma client into src/generated/prisma
RUN npx prisma generate

# Compile TypeScript -> dist/
RUN npm run build

# -------------------------------------------------------------
# STAGE 2: prod
# Starts fresh from a clean slim image.
# Only copies what is needed to actually RUN the app.
# Everything else from the builder is discarded.
# -------------------------------------------------------------
FROM node:24.15.0-bookworm-slim AS prod

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Create a non-root group and user so the app doesn't run as root
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

# Copy the compiled app from the builder stage
COPY --from=builder /app/dist ./dist

# Copy node_modules from the builder stage
# (already installed, no need to npm ci again)
COPY --from=builder /app/node_modules ./node_modules

# package.json is needed at runtime by fastify
COPY --from=builder /app/package.json ./package.json

# Switch to non-root user from here on
USER appuser

# Document that the app runs on port 8080
EXPOSE 8080

# Lock the entrypoint so it can't be overridden
ENTRYPOINT ["npm", "run", "start"]
