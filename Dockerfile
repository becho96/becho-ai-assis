# Becho AI Assistant Dockerfile
FROM node:20-alpine

# Install dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --production=false

# Copy application code
COPY src ./src
COPY scripts ./scripts
COPY agents ./agents
COPY skills ./skills
COPY mcp-servers ./mcp-servers

# Build TypeScript
RUN npm run build

# Create data directory
RUN mkdir -p data

# Expose ports
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "start:server"]
