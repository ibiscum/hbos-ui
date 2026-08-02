# Use Node.js 20 LTS Debian-based image for better native module support
# Debian base provides better compatibility with native module compilation
FROM node:24-trixie-slim

# Set working directory
WORKDIR /app

# Install build essentials and pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@9

# Copy the source code
COPY . ./

# Install dependencies using pnpm
RUN pnpm install

# Build the Vue.js application
RUN pnpm run build

# The built files will be in /app/dist/ for packaging
