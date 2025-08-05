#!/bin/bash

echo "🚀 Installing Docker Desktop on macOS..."

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install Homebrew first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

# Install Docker Desktop
echo "📦 Installing Docker Desktop..."
brew install --cask docker

# Check if installation was successful
if command -v docker &> /dev/null; then
    echo "✅ Docker installed successfully!"
    echo "🐳 Docker version:"
    docker --version
    
    echo ""
    echo "🎯 Next steps:"
    echo "1. Start Docker Desktop: open /Applications/Docker.app"
    echo "2. Wait for Docker to start (you'll see the whale icon in the menu bar)"
    echo "3. Test Docker: docker run hello-world"
    echo "4. Start your Supabase project: npx supabase start"
    
else
    echo "❌ Docker installation failed. Please try manual installation:"
    echo "   Visit: https://www.docker.com/products/docker-desktop/"
fi 