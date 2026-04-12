FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# install dependencies
RUN npm install -f

# Copy source
COPY . .

# Build the application
RUN npm run build

# Expose app port
EXPOSE 3010

# Start the application
CMD ["node", "dist/main"]