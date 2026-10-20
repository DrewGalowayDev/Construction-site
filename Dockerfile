# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies for better caching
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

# Expose the application port
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "index.js"]
