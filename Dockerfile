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
