#!/bin/bash

# Docker Start Script for TopLine Marketplace
# This script helps you run the application locally with Docker

echo "🚀 Starting TopLine Marketplace with Docker..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your credentials."
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit and edit .env first..."
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "🐳 Building Docker containers..."
docker-compose build

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for database to be ready..."
sleep 10

echo ""
echo "✅ Application should be running!"
echo ""
echo "📱 Access points:"
echo "   - Frontend: http://localhost:3000"
echo "   - Admin: http://localhost:3000/dashboard/admin"
echo ""
echo "📊 Useful commands:"
echo "   - View logs: docker-compose logs -f"
echo "   - Stop: docker-compose down"
echo "   - Restart: docker-compose restart"
echo "   - View running containers: docker-compose ps"
echo ""
echo "🔍 Check status:"
docker-compose ps

echo ""
echo "💡 Tip: Run 'docker-compose logs -f' to see application logs"
