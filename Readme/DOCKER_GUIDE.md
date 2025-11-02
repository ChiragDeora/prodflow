# Docker Installation and Basic Usage Guide

## Installing Docker Desktop on macOS

### Method 1: Using Homebrew (Recommended)
```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop
open /Applications/Docker.app
```

### Method 2: Manual Installation
1. Visit [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)
2. Download the `.dmg` file for your Mac (Apple Silicon or Intel)
3. Double-click the downloaded file and drag Docker to Applications
4. Open Docker Desktop from Applications folder

### Method 3: Using Docker CLI (Alternative)
```bash
# Install Docker CLI only
brew install docker

# Install Docker Compose
brew install docker-compose
```

## Verifying Installation

After installation, verify Docker is working:

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version

# Test Docker with a simple container
docker run hello-world
```

## Basic Docker Concepts

### 1. Images vs Containers
- **Image**: A template/blueprint for creating containers
- **Container**: A running instance of an image

### 2. Key Commands

#### Images
```bash
# List all images
docker images

# Pull an image from Docker Hub
docker pull nginx

# Remove an image
docker rmi <image_name>

# Build an image from Dockerfile
docker build -t my-app .
```

#### Containers
```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Run a container
docker run nginx

# Run container in background
docker run -d nginx

# Run container with port mapping
docker run -p 8080:80 nginx

# Stop a container
docker stop <container_id>

# Remove a container
docker rm <container_id>

# View container logs
docker logs <container_id>

# Execute command in running container
docker exec -it <container_id> bash
```

### 3. Docker Compose (Multi-container Applications)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'
services:
  web:
    image: nginx
    ports:
      - "8080:80"
  db:
    image: postgres
    environment:
      POSTGRES_PASSWORD: password
```

Run with Docker Compose:
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs
```

## Common Use Cases

### 1. Running a Web Application
```bash
# Run a web app with port mapping
docker run -p 3000:3000 my-web-app

# Run with environment variables
docker run -e NODE_ENV=production -p 3000:3000 my-web-app
```

### 2. Database Container
```bash
# Run PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres
```

### 3. Development Environment
```bash
# Run with volume mounting (for development)
docker run -v $(pwd):/app -p 3000:3000 my-dev-app
```

## Dockerfile Basics

Create a `Dockerfile` for your application:

```dockerfile
# Use official Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

## Best Practices

### 1. Use Official Images
```bash
# Good
FROM node:18-alpine
FROM python:3.11-slim

# Avoid
FROM some-random-user/node
```

### 2. Multi-stage Builds
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### 3. Use .dockerignore
Create a `.dockerignore` file:
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
```

### 4. Security
```bash
# Don't run as root
USER node

# Use specific versions
FROM node:18.17.0-alpine

# Scan for vulnerabilities
docker scan <image_name>
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# On macOS, ensure Docker Desktop is running
```

2. **Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000

# Use different port
docker run -p 3001:3000 my-app
```

3. **Container Won't Start**
```bash
# Check logs
docker logs <container_id>

# Run interactively for debugging
docker run -it my-app bash
```

### Useful Commands
```bash
# Clean up unused resources
docker system prune

# View Docker disk usage
docker system df

# Stop all containers
docker stop $(docker ps -q)

# Remove all stopped containers
docker container prune
```

## For Your Supabase Project

Once Docker is installed, you can run your Supabase project locally:

```bash
# Start Supabase locally
npx supabase start

# Stop Supabase
npx supabase stop

# Reset database
npx supabase db reset
```

## Next Steps

1. Install Docker Desktop
2. Start Docker Desktop
3. Verify installation with `docker --version`
4. Try running `docker run hello-world`
5. Start your Supabase project with `npx supabase start`

## Resources

- [Docker Official Documentation](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/dev-best-practices/) 