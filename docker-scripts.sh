#!/bin/bash

# Production Scheduler Docker Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
    print_status "Docker is running"
}

# Function to check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_error ".env file not found. Please create one with your Supabase credentials."
        exit 1
    fi
    print_status ".env file found"
}

# Development commands
dev_start() {
    print_header "Starting Development Environment"
    check_docker
    check_env
    docker-compose -f docker-compose.dev.yml up --build -d
    print_status "Development environment started"
    print_status "Application: http://localhost:3000"
    print_status "Database: localhost:5432"
    print_status "Redis: localhost:6379"
}

dev_stop() {
    print_header "Stopping Development Environment"
    docker-compose -f docker-compose.dev.yml down
    print_status "Development environment stopped"
}

dev_logs() {
    print_header "Development Logs"
    docker-compose -f docker-compose.dev.yml logs -f
}

dev_shell() {
    print_header "Opening Development Shell"
    docker-compose -f docker-compose.dev.yml exec app-dev sh
}

# Production commands
prod_start() {
    print_header "Starting Production Environment"
    check_docker
    check_env
    docker-compose up --build -d
    print_status "Production environment started"
    print_status "Application: http://localhost:3000"
    print_status "With Nginx: http://localhost:80"
}

prod_stop() {
    print_header "Stopping Production Environment"
    docker-compose down
    print_status "Production environment stopped"
}

prod_logs() {
    print_header "Production Logs"
    docker-compose logs -f
}

# Database commands
db_shell() {
    print_header "Opening Database Shell"
    docker-compose exec supabase psql -U postgres -d postgres
}

db_backup() {
    print_header "Creating Database Backup"
    timestamp=$(date +%Y%m%d_%H%M%S)
    docker-compose exec supabase pg_dump -U postgres postgres > backup_${timestamp}.sql
    print_status "Backup created: backup_${timestamp}.sql"
}

# Utility commands
cleanup() {
    print_header "Cleaning Up Docker Resources"
    docker-compose down -v
    docker system prune -f
    print_status "Cleanup completed"
}

status() {
    print_header "Container Status"
    docker-compose ps
}

build() {
    print_header "Building Images"
    docker-compose build --no-cache
    print_status "Build completed"
}

# Main script logic
case "$1" in
    "dev")
        case "$2" in
            "start") dev_start ;;
            "stop") dev_stop ;;
            "logs") dev_logs ;;
            "shell") dev_shell ;;
            *) 
                print_error "Usage: $0 dev {start|stop|logs|shell}"
                exit 1
                ;;
        esac
        ;;
    "prod")
        case "$2" in
            "start") prod_start ;;
            "stop") prod_stop ;;
            "logs") prod_logs ;;
            *) 
                print_error "Usage: $0 prod {start|stop|logs}"
                exit 1
                ;;
        esac
        ;;
    "db")
        case "$2" in
            "shell") db_shell ;;
            "backup") db_backup ;;
            *) 
                print_error "Usage: $0 db {shell|backup}"
                exit 1
                ;;
        esac
        ;;
    "cleanup") cleanup ;;
    "status") status ;;
    "build") build ;;
    *)
        echo "Production Scheduler Docker Management Script"
        echo ""
        echo "Usage: $0 {dev|prod|db} {command}"
        echo ""
        echo "Development Commands:"
        echo "  dev start    - Start development environment"
        echo "  dev stop     - Stop development environment"
        echo "  dev logs     - View development logs"
        echo "  dev shell    - Open development container shell"
        echo ""
        echo "Production Commands:"
        echo "  prod start   - Start production environment"
        echo "  prod stop    - Stop production environment"
        echo "  prod logs    - View production logs"
        echo ""
        echo "Database Commands:"
        echo "  db shell     - Open database shell"
        echo "  db backup    - Create database backup"
        echo ""
        echo "Utility Commands:"
        echo "  cleanup      - Clean up Docker resources"
        echo "  status       - Show container status"
        echo "  build        - Build all images"
        echo ""
        echo "Examples:"
        echo "  $0 dev start"
        echo "  $0 prod start"
        echo "  $0 db shell"
        echo "  $0 cleanup"
        ;;
esac
