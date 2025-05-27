FROM node:20-alpine

# Install dependencies for sharp
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create cache directory
RUN mkdir -p cache

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 