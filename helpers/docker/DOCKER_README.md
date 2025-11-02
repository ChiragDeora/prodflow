# Production Scheduler - Docker Setup

This guide will help you set up and run the Production Scheduler application using Docker.

## 🐳 Prerequisites

- Docker Desktop installed and running
- Docker Compose (usually included with Docker Desktop)
- Git (to clone the repository)

## 🚀 Quick Start

### Option 1: Using the Setup Script (Recommended)

1. **Start Development Environment:**
   ```bash
   ./docker-setup.sh dev
   ```

2. **Start Production Environment:**
   ```bash
   ./docker-setup.sh prod
   ```

3. **View Logs:**
   ```bash
   ./docker-setup.sh logs dev    # Development logs
   ./docker-setup.sh logs        # Production logs
   ```

4. **Stop All Containers:**
   ```bash
   ./docker-setup.sh stop
   ```

### Option 2: Manual Docker Commands

#### Development Environment
```bash
# Build and start development containers
docker-compose -f docker-compose.dev.yml up --build -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development containers
docker-compose -f docker-compose.dev.yml down
```

#### Production Environment
```bash
# Build and start production containers
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop production containers
docker-compose down
```

## 📁 Docker Files Structure

```
production-scheduler/
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Production orchestration
├── docker-compose.dev.yml  # Development orchestration
├── docker-setup.sh         # Management script
├── nginx.conf              # Nginx reverse proxy config
├── .dockerignore           # Files to exclude from build
└── DOCKER_README.md        # This file
```

## 🔧 Services Overview

### Development Environment (`docker-compose.dev.yml`)
- **app-dev**: Next.js development server with hot reload
- **supabase-dev**: Local PostgreSQL database
- **redis-dev**: Redis cache for development

### Production Environment (`docker-compose.yml`)
- **app**: Optimized Next.js production server
- **supabase**: Production PostgreSQL database
- **redis**: Production Redis cache
- **nginx**: Reverse proxy with load balancing

## 🌐 Access Points

### Development
- **Application**: http://localhost:3000
- **Database**: localhost:5432
- **Redis**: localhost:6379

### Production
- **Application**: http://localhost:3000
- **Nginx Proxy**: http://localhost:80
- **Database**: localhost:5432
- **Redis**: localhost:6379

## 🔍 Useful Commands

### Container Management
```bash
# View running containers
docker ps

# View container logs
docker logs <container_name>

# Execute commands in container
docker exec -it <container_name> /bin/sh

# View resource usage
docker stats
```

### Database Operations
```bash
# Connect to PostgreSQL
docker exec -it production-scheduler-supabase-1 psql -U postgres -d postgres

# Backup database
docker exec production-scheduler-supabase-1 pg_dump -U postgres postgres > backup.sql

# Restore database
docker exec -i production-scheduler-supabase-1 psql -U postgres -d postgres < backup.sql
```

### Application Management
```bash
# Rebuild application
docker-compose build app

# Restart application only
docker-compose restart app

# Update dependencies
docker-compose exec app npm install
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Kill the process
   kill -9 <PID>
   ```

2. **Container Won't Start**
   ```bash
   # Check container logs
   docker-compose logs <service_name>
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

3. **Database Connection Issues**
   ```bash
   # Check if database is running
   docker-compose ps supabase
   
   # Restart database
   docker-compose restart supabase
   ```

4. **Permission Issues**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER .
   chmod +x docker-setup.sh
   ```

### Cleanup Commands
```bash
# Remove all containers and volumes
./docker-setup.sh cleanup

# Remove specific volumes
docker volume rm production-scheduler_supabase_data

# Clean up unused images
docker image prune -f
```

## 🔒 Environment Variables

The application uses the following environment variables (defined in `.env`):

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📊 Monitoring

### Health Checks
- **Application**: http://localhost:3000/api/health
- **Nginx**: http://localhost/health

### Resource Monitoring
```bash
# View container resource usage
docker stats

# View system resource usage
docker system df
```

## 🚀 Deployment

### Local Production Build
```bash
# Build production image
docker build -t production-scheduler:latest .

# Run production container
docker run -p 3000:3000 --env-file .env production-scheduler:latest
```

### Cloud Deployment
The Docker setup is ready for deployment to:
- AWS ECS
- Google Cloud Run
- Azure Container Instances
- DigitalOcean App Platform
- Heroku Container Registry

## 📝 Development Workflow

1. **Start Development Environment:**
   ```bash
   ./docker-setup.sh dev
   ```

2. **Make Code Changes:**
   - Edit files in your IDE
   - Changes are automatically reflected (hot reload)

3. **Test Changes:**
   - Visit http://localhost:3000
   - Check logs: `./docker-setup.sh logs dev`

4. **Stop Development:**
   ```bash
   ./docker-setup.sh stop
   ```

## 🤝 Contributing

When contributing to the Docker setup:

1. Test both development and production environments
2. Update this README if you add new services
3. Ensure all environment variables are documented
4. Test the setup script with different scenarios

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. View container logs: `./docker-setup.sh logs`
3. Check Docker Desktop is running
4. Ensure ports are not in use by other applications
