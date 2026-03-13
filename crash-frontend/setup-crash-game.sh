#!/bin/bash

# Crash Game Setup Script
# Run with: bash setup-crash-game.sh

echo "🎮 Setting up Crash Game..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the client directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install ws @types/ws ts-node

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start WebSocket server (Terminal 1):"
echo "   npm run mock:crash"
echo ""
echo "2. Start Next.js app (Terminal 2):"
echo "   npm run dev"
echo ""
echo "3. Open browser:"
echo "   http://localhost:3000/crash-game"
echo ""
echo "📚 Documentation:"
echo "   - Quick start: QUICKSTART_CRASH.md"
echo "   - Full docs: CRASH_GAME_README.md"
echo "   - Summary: CRASH_GAME_SUMMARY.md"
echo ""
echo "🎉 Happy coding!"
