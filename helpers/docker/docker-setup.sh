#!/bin/bash

# Production Scheduler Docker Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop first."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to build and start development environment
dev_setup() {
    print_status "Setting up development environment..."
    check_docker
    
    # Change to the directory containing docker-compose files
    cd "$(dirname "$0")"
    
    # Build and start development containers
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_success "Development environment started!"
    print_status "Access your application at: http://localhost:3000"
    print_status "Database available at: localhost:5432"
    print_status "Redis available at: localhost:6379"
}

# Function to build and start production environment
prod_setup() {
    print_status "Setting up production environment..."
    check_docker
    
    # Change to the directory containing docker-compose files
    cd "$(dirname "$0")"
    
    # Build and start production containers
    docker-compose up --build -d
    
    print_success "Production environment started!"
    print_status "Access your application at: http://localhost:3000"
    print_status "With nginx proxy at: http://localhost:80"
}

# Function to stop all containers
stop_containers() {
    print_status "Stopping all containers..."
    
    # Change to the directory containing docker-compose files
    cd "$(dirname "$0")"
    
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    print_success "All containers stopped"
}

# Function to view logs
view_logs() {
    # Change to the directory containing docker-compose files
    cd "$(dirname "$0")"
    
    if [ "$1" = "dev" ]; then
        docker-compose -f docker-compose.dev.yml logs -f
    else
        docker-compose logs -f
    fi
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up Docker resources..."
        
        # Change to the directory containing docker-compose files
        cd "$(dirname "$0")"
        
        docker-compose down -v --rmi all
        docker-compose -f docker-compose.dev.yml down -v --rmi all
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to show status
show_status() {
    # Change to the directory containing docker-compose files
    cd "$(dirname "$0")"
    
    print_status "Container Status:"
    docker-compose ps
    echo ""
    print_status "Development Container Status:"
    docker-compose -f docker-compose.dev.yml ps
}

# Function to show help
show_help() {
    echo "Production Scheduler Docker Management Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev       - Start development environment"
    echo "  prod      - Start production environment"
    echo "  stop      - Stop all containers"
    echo "  logs      - View logs (use 'logs dev' for development)"
    echo "  status    - Show container status"
    echo "  cleanup   - Remove all containers, volumes, and images"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev     - Start development environment"
    echo "  $0 logs dev - View development logs"
    echo "  $0 cleanup - Clean up all Docker resources"
}

# Main script logic
case "${1:-help}" in
    "dev")
        dev_setup
        ;;
    "prod")
        prod_setup
        ;;
    "stop")
        stop_containers
        ;;
    "logs")
        view_logs "$2"
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|*)
        show_help
        ;;
esac
