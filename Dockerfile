# Use official Node.js 14 image as base
# FROM node:19.0.0-slim
FROM node:18.17.0

# Set working directory inside the container
WORKDIR /burgan-task-api/src

# Copy package.json and package-lock.json (if available) to work directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code to work directory
COPY . .

# Expose port 8080
EXPOSE 8080

# Command to run the application
CMD ["npm", "run", "start:dev"]
