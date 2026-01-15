#!/bin/bash

# RWA Lending Protocol - Setup Script
# This script initializes the Foundry project with required dependencies

set -e

echo "🚀 Setting up RWA Lending Protocol..."

# Check if Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "❌ Foundry not found. Installing..."
    curl -L https://foundry.paradigm.xyz | bash
    source ~/.bashrc
    foundryup
fi

echo "✅ Foundry installed"

# Initialize lib directory if it doesn't exist
if [ ! -d "lib" ]; then
    mkdir -p lib
fi

# Install OpenZeppelin Contracts
if [ ! -d "lib/openzeppelin-contracts" ]; then
    echo "📦 Installing OpenZeppelin Contracts..."
    forge install OpenZeppelin/openzeppelin-contracts
fi

# Install Forge Standard Library
if [ ! -d "lib/forge-std" ]; then
    echo "📦 Installing Forge Standard Library..."
    forge install foundry-rs/forge-std
fi

echo "✅ Dependencies installed"

# Build the project
echo "🔨 Building contracts..."
forge build

# Run tests
echo "🧪 Running tests..."
forge test -vv

echo ""
echo "✅ Setup complete!"
echo ""
echo "Available commands:"
echo "  forge build        - Compile contracts"
echo "  forge test         - Run tests"
echo "  forge test -vvv    - Run tests with verbose output"
echo "  forge coverage     - Generate coverage report"
echo ""
echo "To deploy:"
echo "  export PRIVATE_KEY=<your-private-key>"
echo "  export ETH_RPC_URL=<your-rpc-url>"
echo "  forge script script/Deploy.s.sol --rpc-url \$ETH_RPC_URL --broadcast"

