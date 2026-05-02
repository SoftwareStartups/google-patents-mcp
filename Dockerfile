# Stage 1: Build the TypeScript source
FROM oven/bun:debian@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e AS builder
WORKDIR /app

# Install dependencies
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile

# Copy source and build
COPY src ./src
RUN bun run build

# Stage 2: Create production image
FROM oven/bun:debian@sha256:87416c977a612a204eb54ab9f3927023c2a3c971f4f345a01da08ea6262ae30e
WORKDIR /app

# Install only production dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy built artifacts
COPY --from=builder /app/build ./build

# Ensure non-root ownership of app files
RUN chown -R bun:bun /app

# Start the MCP server
USER bun
CMD ["bun", "run", "build/index.js", "serve"]
