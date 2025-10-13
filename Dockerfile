# ---- Base image ----
FROM node:20-alpine AS base

# Create app directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install dependencies (works with or without lockfile)
RUN npm install --omit=dev

# Copy the rest of the application
COPY . .

# Expose the app port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production \
    PORT=3000

# Healthcheck (optional)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/status || exit 1

# Start the app
CMD ["node", "app.js"]
