# Installation Instructions

## ⚠️ IMPORTANT: Node.js Version

**You must use Node.js LTS version 18.x, 20.x, or 22.x**

**DO NOT use Node.js v23.x** - it will cause build errors with better-sqlite3 on Windows!

Check your version:
```bash
node --version
```

If you have v23.x, downgrade to Node.js 20.x LTS from https://nodejs.org/

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/EnragedAntelope/autotrader.git
cd autotrader
```

### 2. Install Dependencies

**Windows Users** - Read this first:
- Ensure Node.js version is 18.x, 20.x, or 22.x (NOT 23.x)
- You may need Visual Studio Build Tools (see [Windows Setup](#windows-specific-setup) below)

**macOS/Linux:**
```bash
npm install
```

**Windows:**
```bash
# Verify Node.js version first!
node --version

# Install dependencies
npm install
```

**Note**: If you have Python 3.13, you might see warnings during install but npm install should complete successfully. If you later get a MODULE_VERSION error when launching the app, see [Troubleshooting](#error-node_module_version-115-vs-135-electron-launch) below.

### 3. Set Up Environment Variables

Copy the example environment file:

**Linux/Mac:**
```bash
cp .env.example .env
```

**Windows (Command Prompt):**
```cmd
copy .env.example .env
```

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

Edit `.env` and add your Alpaca API keys (see README.md for detailed instructions)

### 4. Run the Application

```bash
npm run dev
```

The app should open automatically. You should see:
- Electron window with the trading scanner UI
- Green "PAPER MODE" indicator in top bar
- Account information loaded (if API keys are configured)

## First Time Setup

### Get Alpaca API Keys

1. Sign up at https://alpaca.markets/
2. Go to Paper Trading Dashboard
3. Generate API keys
4. Copy to `.env` file

### Optional: Alpha Vantage API Key

1. Visit https://www.alphavantage.co/support/#api-key
2. Get free API key
3. Add to `.env` file

## Windows-Specific Setup

### Installing Visual Studio Build Tools

better-sqlite3 requires native compilation on Windows. You need build tools:

**Option 1: Automated (Recommended)**
```bash
# Run as Administrator in PowerShell
npm install --global windows-build-tools
```

**Option 2: Manual Installation**
1. Download Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/
2. Run the installer
3. Select "Desktop development with C++"
4. Install

### Using NVM for Windows (Recommended)

NVM allows you to easily switch Node.js versions:

1. **Install nvm-windows**: https://github.com/coreybutler/nvm-windows/releases
2. **Install and use Node.js 20.x**:
   ```bash
   nvm install 20
   nvm use 20
   node --version  # Should show v20.x.x
   ```

## Troubleshooting Windows Installation Errors

### Error: "C++20 or later required"

**Cause**: Node.js v23.x requires C++20, but better-sqlite3 doesn't support it yet.

**Fix**:
```bash
# 1. Check your Node.js version
node --version

# 2. If it shows v23.x, downgrade to v20.x
# Download from: https://nodejs.org/en/download/
# Or use nvm-windows:
nvm install 20
nvm use 20

# 3. Clean and reinstall
npm cache clean --force
rmdir /s /q node_modules
npm install
```

### Error: "MSBuild.exe failed with exit code: 1"

**Cause**: Missing Visual Studio Build Tools

**Fix**:
```bash
# Install build tools (run as Administrator)
npm install --global windows-build-tools

# Then try again
npm install
```

### Error: "NODE_MODULE_VERSION 115 vs 135" (Electron Launch)

**Cause**: better-sqlite3 was compiled for Node.js but needs to be rebuilt for Electron

**Symptoms**:
```
The module '...\better-sqlite3\build\Release\better_sqlite3.node'
was compiled against a different Node.js version using
NODE_MODULE_VERSION 115. This version requires NODE_MODULE_VERSION 135.
```

**Fix - Option 1 (Simplest)**:
```bash
# Just rebuild better-sqlite3 for Electron
npx electron-rebuild -f -w better-sqlite3
```

**Fix - Option 2 (If Option 1 fails due to Python version)**:

If you have Python 3.13 (which node-gyp doesn't support yet), install Python 3.12:

1. Download Python 3.12.x from https://www.python.org/downloads/windows/
2. Install it
3. Set the PYTHON environment variable:
   ```cmd
   # In Command Prompt (run as Administrator)
   setx PYTHON "C:\Python312\python.exe" /M
   ```
4. Restart your terminal and try again:
   ```bash
   npx electron-rebuild -f -w better-sqlite3
   ```

**Fix - Option 3 (Clean reinstall)**:
```bash
# Remove everything and start fresh
rmdir /s /q node_modules
del /q package-lock.json
npm cache clean --force

# Reinstall
npm install

# Then rebuild for Electron
npx electron-rebuild -f -w better-sqlite3
```

**Note**: This error only occurs when launching the Electron app, not during `npm install`.

### Error: "EPERM: operation not permitted, rmdir"

**Cause**: Windows file system locks

**Fix**:
```bash
# 1. Close all applications (VS Code, terminals, etc.)

# 2. Delete node_modules manually
rmdir /s /q node_modules

# 3. Clear npm cache
npm cache clean --force

# 4. Restart your computer (if still failing)

# 5. Try installing again
npm install
```

### Error: "gyp ERR! build error"

**Cause**: Build tools not configured correctly

**Fix**:
```bash
# 1. Check if Python is installed
python --version  # Should be 3.x

# 2. Configure npm to use correct MSBuild
npm config set msvs_version 2022

# 3. Try building better-sqlite3 separately
npm install better-sqlite3@9.2.2 --build-from-source

# 4. Then install everything
npm install
```

## General Troubleshooting

### Database Not Created

The database will be automatically created on first launch in:
- **Windows**: `%APPDATA%/alpaca-trading-scanner/`
- **macOS**: `~/Library/Application Support/alpaca-trading-scanner/`
- **Linux**: `~/.config/alpaca-trading-scanner/`

### Port Already in Use

If Vite dev server port 5173 is in use:
```bash
# Edit vite.config.ts and change the port number in server.port
```

### API Keys Not Loading

Make sure:
1. `.env` file exists in project root (same directory as package.json)
2. No extra spaces or quotes around API keys
3. File is named exactly `.env` (not `.env.txt`)
4. Restart the application after editing

## Still Need Help?

1. **Check existing issues**: https://github.com/EnragedAntelope/autotrader/issues
2. **Open a new issue**: Include:
   - Your operating system and version
   - Node.js version (`node --version`)
   - npm version (`npm --version`)
   - Complete error message
   - Steps you've already tried

## Phase 1 Complete

All infrastructure is in place:
- ✅ Electron + React setup
- ✅ TypeScript configuration
- ✅ SQLite database schema
- ✅ Alpaca API service
- ✅ Redux state management
- ✅ Material-UI components
- ✅ IPC security bridge

Ready for Phase 2 development (Screening Engine implementation).
