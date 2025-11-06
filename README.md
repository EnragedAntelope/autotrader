# Alpaca Trading Scanner & Automation Platform

A cross-platform desktop application for automated stock and options screening with integrated trading, risk management, and position monitoring.

## ⚠️ IMPORTANT DISCLAIMER

**This software is for educational purposes only. Trading stocks and options involves substantial risk of loss. Use this software at your own risk. The authors and contributors are not responsible for any financial losses incurred through the use of this software.**

**Always start with paper trading and thoroughly test your strategies before considering live trading.**

## Features

- **Automated Screening**: Create custom screening profiles for stocks and options with multiple parameters
- **Scheduled Scanning**: Automatically run scans at specified intervals during market hours
- **Risk Management**: Built-in risk controls including transaction limits, daily/weekly spend limits, and position limits
- **Position Monitoring**: Automatic stop-loss and take-profit execution
- **Trade History**: Comprehensive logging of all trades with P/L tracking
- **Paper & Live Trading**: Switch between paper (simulated) and live trading modes
- **Cross-Platform**: Works on Windows, macOS, and Linux

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI
- **Backend**: Electron, Node.js
- **Database**: SQLite
- **State Management**: Redux Toolkit
- **Charting**: Recharts
- **Trading API**: Alpaca Markets

## Prerequisites

- **Node.js**: Version 18.x, 20.x, or 22.x LTS (⚠️ **NOT v23.x** - see [Windows Installation](#windows-specific-installation) below)
- **npm**: Version 9.x or higher
- **Alpaca Account**: Free paper trading account from [Alpaca Markets](https://alpaca.markets/)
- **Alpha Vantage API Key** (Optional): For fundamental data. Get free key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

### Windows Additional Requirements

- **Visual Studio Build Tools** (for native module compilation):
  - Download from: https://visualstudio.microsoft.com/downloads/
  - Select "Desktop development with C++" workload
  - **OR** use the automated installer:
    ```bash
    npm install --global windows-build-tools
    ```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/EnragedAntelope/autotrader.git
cd autotrader
```

### 2. Install Dependencies

**macOS/Linux:**
```bash
npm install
```

**Windows:**
```bash
# Ensure you're using Node.js LTS (18.x, 20.x, or 22.x)
node --version

# If you have v23.x, downgrade to LTS first:
# Download from: https://nodejs.org/en/download/

# Then install dependencies
npm install
```

### 3. Set Up API Keys

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

Edit `.env` and add your API keys:

```env
# Paper Trading Keys (from Alpaca Dashboard)
ALPACA_PAPER_API_KEY=your_paper_api_key_here
ALPACA_PAPER_SECRET_KEY=your_paper_secret_key_here

# Live Trading Keys (ONLY if you plan to use live trading)
ALPACA_LIVE_API_KEY=your_live_api_key_here
ALPACA_LIVE_SECRET_KEY=your_live_secret_key_here

# Alpha Vantage (Optional - for fundamental data)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here

# Default Trading Mode
TRADING_MODE=paper
```

### 4. Rebuild better-sqlite3 for Electron (If Needed)

**When do you need this?**
- If you get a MODULE_VERSION error when running `npm run dev`

**Important:** Run `npm install` first (step 2) before rebuilding!

**Quick fix:**
```bash
# Make sure dependencies are installed first
npm install

# Then rebuild
npm run rebuild
```

This script will:
- Check your Python version (needs 3.8-3.12, NOT 3.13)
- Rebuild better-sqlite3 for Electron automatically
- Give you clear error messages if something is wrong

**If you have Python 3.13:**
- Install Python 3.12 from https://www.python.org/downloads/
- Windows: Set environment variable `PYTHON` to point to Python 3.12
- Then run `npm run rebuild` again

See [INSTALL.md](INSTALL.md) for detailed troubleshooting.

### 5. Getting Your Alpaca API Keys

1. Sign up for a free account at [Alpaca Markets](https://app.alpaca.markets/signup)
2. Navigate to your [Paper Trading Dashboard](https://app.alpaca.markets/paper/dashboard/overview)
3. Click on "View API Keys" in the right sidebar
4. Generate new keys if needed
5. Copy the API Key ID and Secret Key to your `.env` file

**For Live Trading** (not recommended initially):
1. Complete account verification and funding
2. Navigate to the [Live Trading Dashboard](https://app.alpaca.markets/live/dashboard/overview)
3. Generate live trading API keys
4. Copy to the ALPACA_LIVE_* variables in `.env`

### 6. Getting Alpha Vantage API Key (Optional)

1. Visit [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Enter your email and click "GET FREE API KEY"
3. Copy the key to your `.env` file

Note: Free tier is limited to 25 requests/day and 5 requests/minute.

## Running the Application

### Development Mode

```bash
npm run dev
```

This will:
1. Start the Vite development server
2. Launch the Electron application
3. Enable hot-reloading for the React frontend
4. Open DevTools automatically

### Production Build

```bash
npm run build
npm run build:electron
```

This creates distributable packages in the `dist-electron` directory.

## Project Structure

```
alpaca-trading-scanner/
├── electron/               # Electron main process
│   ├── main.js            # Main entry point
│   ├── preload.js         # IPC bridge (security)
│   └── services/          # Backend services
│       ├── alpacaService.js    # Alpaca API wrapper
│       ├── dataService.js      # Market data aggregation
│       ├── scannerService.js   # Screening engine
│       ├── schedulerService.js # Cron job manager
│       └── tradeService.js     # Order execution & risk checks
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── store/            # Redux slices
│   ├── types/            # TypeScript definitions
│   └── utils/            # Utility functions
├── database/
│   └── schema.sql        # SQLite schema
└── .env                  # API keys (DO NOT COMMIT!)
```

## Usage Guide

### First Run

1. Launch the application
2. Verify you're in **PAPER TRADING** mode (green indicator in top bar)
3. Check that your account info loads correctly
4. Explore the Dashboard to see account summary

### Creating a Screening Profile

1. Navigate to **Screener Builder**
2. Enter a name for your profile
3. Select asset type (Stock, Call Option, or Put Option)
4. Set your screening parameters
5. Configure automation settings
6. Save the profile

### Risk Management Settings

1. Navigate to **Risk Management**
2. Configure your limits
3. Set default stop-loss and take-profit percentages
4. Save settings

### Running Scans

**Manual Scan**: Open a profile and click "Run Scan Now"

**Automated Scanning**: Enable scheduling on a profile and start the global scheduler

## Troubleshooting

### Windows-Specific Installation Issues

#### Error: "C++20 or later required" during npm install

**Problem**: You're using Node.js v23.x which requires C++20, but better-sqlite3 doesn't fully support it yet.

**Solution**:
1. **Downgrade to Node.js LTS** (Recommended):
   - Uninstall Node.js v23.x
   - Download Node.js 20.x LTS from https://nodejs.org/
   - Install and verify: `node --version` (should show v20.x.x)
   - Run `npm install` again

2. **Alternative - Use NVM for Windows**:
   ```bash
   # Install nvm-windows from: https://github.com/coreybutler/nvm-windows
   nvm install 20
   nvm use 20
   npm install
   ```

#### Error: "MSBuild.exe failed with exit code: 1"

**Problem**: Missing Visual Studio Build Tools

**Solution**:
```bash
# Option 1: Install build tools globally (run as Administrator)
npm install --global windows-build-tools

# Option 2: Manual installation
# Download Visual Studio Build Tools from:
# https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++" workload
```

#### Error: "EPERM: operation not permitted, rmdir"

**Problem**: Windows file locking during installation

**Solution**:
```bash
# Close all applications that might be using node_modules
# Delete node_modules folder manually
rmdir /s /q node_modules

# Clear npm cache
npm cache clean --force

# Try installing again
npm install
```

#### Still Having Issues?

If you continue to have problems with better-sqlite3 on Windows:

1. **Check Node.js version**: Must be 18.x, 20.x, or 22.x (NOT 23.x)
   ```bash
   node --version
   ```

2. **Verify Visual Studio Build Tools**:
   ```bash
   npm config get msvs_version
   ```

3. **Try installing better-sqlite3 separately**:
   ```bash
   npm install better-sqlite3@9.2.2 --build-from-source
   ```

4. **Report the issue**: If none of these work, please open an issue at:
   https://github.com/EnragedAntelope/autotrader/issues

### General Troubleshooting

#### API Key Errors

**Error**: "Missing Alpaca API credentials"

**Solution**:
- Verify `.env` file exists in project root
- Check that key names match exactly (ALPACA_PAPER_API_KEY, etc.)
- Ensure no extra spaces or quotes around keys
- Restart the application after editing `.env`

#### Database Errors

**Error**: "Database access error"

**Solution**:
- Close the application completely
- Delete the database file (location: user data directory)
- Restart the application (database will be recreated)

#### Market Data Not Loading

**Error**: "Failed to get market data"

**Solutions**:
- Check internet connection
- Verify API keys are valid
- Check if you've exceeded Alpha Vantage rate limits (25/day)
- Wait a few minutes and try again

## Implementation Status

### ✅ Phase 1: Foundation (Complete)
- Project structure and build setup
- Electron + React integration with TypeScript
- SQLite database with full schema
- Alpaca API service integration
- Material-UI component library
- Redux Toolkit state management
- Account info display
- Trading mode switching (Paper/Live)
- Dashboard with account summary

### ✅ Phase 2: Rate Limiting & Core Services (Complete)
- API rate limiting service (Alpaca & Alpha Vantage)
- Rate limit tracking and enforcement
- Stock screening engine
- Trade execution service with risk checks
- Position tracking system
- Market data aggregation service
- Scheduler service (cron-based automation)

### 🚧 Phase 3: UI Components & Options Support (In Progress - 60% Complete)
**Completed:**
- ✅ Options API integration (getOptionContracts, getOptionChain, getOptionQuote)
- ✅ ScreenerBuilder UI - Complete screening profile management
- ✅ Scheduler UI - Automated scan scheduling and monitoring
- ✅ Enhanced Settings UI - Rate limit configuration, preferences

**In Progress:**
- 🔄 Scan Results Viewer - Results table with filtering and trade execution
- 🔄 Options Screening Logic - Backend option filtering implementation

### 📋 Planned Future Phases
- **Phase 4**: Advanced position monitoring and automation
- **Phase 5**: Backtesting and strategy analysis
- **Phase 6**: Polish features (notifications, themes, charts)

## Security Notes

- API keys stored locally in `.env` file (never committed)
- All API calls made from Electron main process
- IPC bridge only exposes necessary functions
- Context isolation enabled for security

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Open an issue on GitHub
- Review documentation and troubleshooting section

---

**Remember**: Always start with paper trading, set appropriate risk limits, and never trade with money you can't afford to lose.