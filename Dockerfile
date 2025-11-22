FROM oven/bun:alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application files
COPY . .

# Expose port
EXPOSE 4000

# Start the application
CMD ["bun", "run", "main.js"]
