# Helpers Directory

This directory contains helper files and utilities for the Production Scheduler project.

## 📁 Directory Structure

```
helpers/
├── sql/           # SQL scripts and database utilities
├── docker/        # Docker configuration and setup files
└── README.md      # This file
```

## 🗄️ SQL Directory (`sql/`)

Contains all SQL scripts for database management, migrations, and utilities.

### Categories:
- **Migrations**: Database schema changes and updates
- **Setup**: Initial database setup scripts
- **Fixes**: Database fixes and corrections
- **Queries**: Utility queries for data management
- **Cleanup**: Data cleanup and maintenance scripts

### Usage:
```bash
# Run a specific SQL script
psql -U postgres -d postgres -f helpers/sql/script_name.sql

# Apply migrations
psql -U postgres -d postgres -f helpers/sql/migration_script.sql
```

## 🐳 Docker Directory (`docker/`)

Contains all Docker-related configuration files and setup scripts.

### Files:
- **Dockerfile**: Production Docker image configuration
- **Dockerfile.dev**: Development Docker image configuration
- **docker-compose.yml**: Production environment orchestration
- **docker-compose.dev.yml**: Development environment orchestration
- **docker-setup.sh**: Docker management script
- **nginx.conf**: Nginx reverse proxy configuration
- **.dockerignore**: Files to exclude from Docker builds
- **DOCKER_README.md**: Comprehensive Docker documentation
- **install-docker.sh**: Docker installation script

### Usage:
```bash
# Navigate to docker directory
cd helpers/docker

# Start development environment
./docker-setup.sh dev

# Start production environment
./docker-setup.sh prod

# View logs
./docker-setup.sh logs dev
```

## 🔧 Quick Commands

### Database Operations:
```bash
# Run SQL script
psql -U postgres -d postgres -f helpers/sql/script_name.sql

# Connect to database
psql -U postgres -d postgres
```

### Docker Operations:
```bash
# Start development
cd helpers/docker && ./docker-setup.sh dev

# Start production
cd helpers/docker && ./docker-setup.sh prod

# Stop all containers
cd helpers/docker && ./docker-setup.sh stop

# View logs
cd helpers/docker && ./docker-setup.sh logs dev

# Check status
cd helpers/docker && ./docker-setup.sh status
```

## 📝 File Naming Conventions

### SQL Files:
- `create_*.sql` - Table creation scripts
- `add_*.sql` - Column or data addition scripts
- `fix_*.sql` - Bug fixes and corrections
- `update_*.sql` - Data update scripts
- `drop_*.sql` - Table or data removal scripts
- `migration_*.sql` - Database migration scripts

### Docker Files:
- `Dockerfile` - Production build
- `Dockerfile.dev` - Development build
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development orchestration

## 🚀 Best Practices

1. **SQL Scripts**: Always backup before running destructive operations
2. **Docker**: Use the setup script for consistent operations
3. **Documentation**: Update README files when adding new helpers
4. **Testing**: Test scripts in development before production use
