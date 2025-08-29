#!/bin/bash

# SPARC Development Environment Setup Script
# This script sets up the local development environment

set -e

echo "🚀 Setting up SPARC Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating from .env.example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_status "Created .env file from .env.example"
        print_warning "Please update .env file with your Supabase credentials"
    else
        print_error ".env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Create necessary directories
print_status "Creating required directories..."
mkdir -p logs
mkdir -p config/ssl
mkdir -p data/redis

# Stop any existing containers
print_status "Stopping existing containers..."
docker-compose -f scripts/dev/docker-compose.yml down --remove-orphans 2>/dev/null || true

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose -f scripts/dev/docker-compose.yml pull

# Build and start services
print_status "Building and starting services..."
docker-compose -f scripts/dev/docker-compose.yml up --build -d

# Wait for services to be healthy
print_status "Waiting for services to start..."
sleep 10

# Check service health
echo "\n📊 Service Status:"
echo "=================="

# Check backend health
if curl -s -f http://localhost:5000/api/health >/dev/null 2>&1; then
    print_status "Backend API: Running (http://localhost:5000)"
else
    print_warning "Backend API: Not responding yet (http://localhost:5000)"
fi

# Check frontend
if curl -s -f http://localhost:3000 >/dev/null 2>&1; then
    print_status "Frontend: Running (http://localhost:3000)"
else
    print_warning "Frontend: Not responding yet (http://localhost:3000)"
fi

# Check Redis
if docker exec sparc-redis-dev redis-cli ping >/dev/null 2>&1; then
    print_status "Redis: Running (localhost:6379)"
else
    print_warning "Redis: Not responding (localhost:6379)"
fi

# Check Nginx
if curl -s -f http://localhost >/dev/null 2>&1; then
    print_status "Nginx Proxy: Running (http://localhost)"
else
    print_warning "Nginx Proxy: Not responding (http://localhost)"
fi

echo "\n🎉 Development environment setup complete!"
echo "\n📝 Next Steps:"
echo "   1. Update .env file with your Supabase credentials"
echo "   2. Access the application at: http://localhost"
echo "   3. Backend API available at: http://localhost:5000"
echo "   4. Frontend dev server at: http://localhost:3000"
echo "\n🔧 Useful Commands:"
echo "   View logs: docker-compose -f scripts/dev/docker-compose.yml logs -f"
echo "   Stop services: docker-compose -f scripts/dev/docker-compose.yml down"
echo "   Restart services: docker-compose -f scripts/dev/docker-compose.yml restart"
echo "   Shell into backend: docker exec -it sparc-backend-dev sh"
echo "   Shell into frontend: docker exec -it sparc-frontend-dev sh"