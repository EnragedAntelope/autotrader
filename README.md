# Alpaca Trading Scanner & Automation Platform

A cross-platform desktop application for automated stock and options screening with integrated trading, risk management, and position monitoring.

## ⚠️ IMPORTANT DISCLAIMER

**This software is for educational purposes only. Trading stocks and options involves substantial risk of loss. Use this software at your own risk. The authors and contributors are not responsible for any financial losses incurred through the use of this software.**

**Always start with paper trading and thoroughly test your strategies before considering live trading.**

## Features

### 📊 Screening & Analysis
- **Advanced Parameter Library**: 45+ parameters including fundamental ratios (P/E, P/B, D/E, Current Ratio, ROE, etc.)
- **Technical Indicators**: RSI, Beta, momentum, volume analysis
- **Options Greeks**: Delta, gamma, theta, vega, IV with educational tooltips
- **7 Pre-Built Templates**: Value stocks, growth stocks, dividend stocks, momentum, high-delta calls, ATM calls, protective puts
- **Help Tooltips**: Every parameter includes educational content and suggested "good" values
- **Input Validation**: Prevents invalid data entry with real-time feedback

### 📈 Backtesting & Strategy Validation
- **Historical Simulation**: Test strategies against past market data
- **Performance Metrics**: Win rate, Sharpe ratio, max drawdown, profit factor
- **Trade-by-Trade Analysis**: Detailed trade history with entry/exit points
- **Configurable Parameters**: Adjust starting capital, position size, time periods

### 🤖 Automation & Trading
- **Automated Screening**: Create custom screening profiles for stocks and options
- **Scheduled Scanning**: Run scans at specified intervals during market hours
- **Auto-Execution**: Optional automatic order placement (use with caution!)
- **Position Monitoring**: Real-time P/L tracking with auto-refresh
- **Smart Stop-Loss/Take-Profit**: Automatic position exits when thresholds hit

### 🛡️ Risk Management
- **Transaction Limits**: Maximum amount per trade
- **Daily/Weekly Spend Limits**: Prevent over-trading
- **Position Limits**: Cap on open positions
- **Default Risk Levels**: Set standard stop-loss and take-profit percentages
- **Duplicate Position Control**: Allow or prevent multiple positions in same symbol

### 📊 Monitoring & Reporting
- **Active Positions Dashboard**: Real-time monitoring with P/L calculations
- **Comprehensive P/L Statistics**: Total P/L (realized + unrealized), win rate, average win/loss, largest win/loss
- **Trade History**: Complete log with filtering by symbol, status, date
- **Statistics Cards**: At-a-glance performance metrics
- **Position Alerts**: Notifications for stop-loss and take-profit triggers

### 🎨 User Experience
- **Dark Theme**: Toggle between light and dark modes (saved to localStorage)
- **Educational UI**: Contextual help throughout the application
- **Responsive Design**: Clean Material-UI interface
- **Cross-Platform**: Windows, macOS, and Linux support

## Tech Stack

- **Frontend**: React 18, TypeScript, Material-UI
- **Backend**: Electron, Node.js
- **Database**: SQLite
- **State Management**: Redux Toolkit
- **Charting**: Recharts
- **Trading API**: Alpaca Markets

---

## Installation

Choose your operating system:
- [Linux/macOS Installation](#linuxmacos-installation)
- [Windows Installation](#windows-installation)

---

## Linux/macOS Installation

### Prerequisites

- **Node.js**: Version 18.x, 20.x, or 22.x LTS
- **npm**: Version 9.x or higher
- **Python**: Version 3.8-3.12 (NOT 3.13)
- **Alpaca Account**: Free paper trading account from [Alpaca Markets](https://alpaca.markets/)
- **Alpha Vantage API Key** (Optional): Get free key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

### Complete Installation (Copy/Paste)

```bash
# 1. Clone the repository
git clone https://github.com/EnragedAntelope/autotrader.git
cd autotrader

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env and add your API keys
# Use your preferred editor (nano, vim, code, etc.)
nano .env

# 4. Install dependencies
npm install

# 5. Rebuild better-sqlite3 for Electron (if you get MODULE_VERSION error)
npm run rebuild

# 6. Start the application
npm run dev
```

### Setting Up .env File

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

### Linux/macOS Troubleshooting

#### Python Version Issues

If you have Python 3.13, you need to downgrade:

```bash
# Check Python version
python3 --version

# If you have 3.13, install 3.12
# macOS (using Homebrew):
brew install python@3.12

# Linux (Ubuntu/Debian):
sudo apt-get install python3.12

# Then rebuild
npm run rebuild
```

#### MODULE_VERSION Error

```bash
# Make sure dependencies are installed first
npm install

# Then rebuild better-sqlite3
npm run rebuild
```

#### Permission Errors

```bash
# If you get EACCES errors during npm install
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

---

## Windows Installation

### Prerequisites

- **Node.js**: Version 18.x, 20.x, or 22.x LTS (**⚠️ NOT v23.x** - see troubleshooting below)
- **npm**: Version 9.x or higher
- **Python**: Version 3.8-3.12 (NOT 3.13)
- **Visual Studio Build Tools**: Required for native module compilation
- **Alpaca Account**: Free paper trading account from [Alpaca Markets](https://alpaca.markets/)
- **Alpha Vantage API Key** (Optional): Get free key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

### Installing Visual Studio Build Tools

**Option 1 - Automated (Recommended):**
```powershell
# Run PowerShell as Administrator
npm install --global windows-build-tools
```

**Option 2 - Manual:**
1. Download Visual Studio Build Tools from: https://visualstudio.microsoft.com/downloads/
2. Install with "Desktop development with C++" workload selected

### Complete Installation (Copy/Paste)

**Command Prompt:**
```cmd
REM 1. Verify Node.js version (MUST be 18.x, 20.x, or 22.x)
node --version

REM 2. Clone the repository
git clone https://github.com/EnragedAntelope/autotrader.git
cd autotrader

REM 3. Copy environment file
copy .env.example .env

REM 4. Edit .env and add your API keys
REM Use notepad or your preferred editor
notepad .env

REM 5. Install dependencies
npm install

REM 6. Rebuild better-sqlite3 for Electron (if you get MODULE_VERSION error)
npm run rebuild

REM 7. Start the application
npm run dev
```

**PowerShell:**
```powershell
# 1. Verify Node.js version (MUST be 18.x, 20.x, or 22.x)
node --version

# 2. Clone the repository
git clone https://github.com/EnragedAntelope/autotrader.git
cd autotrader

# 3. Copy environment file
Copy-Item .env.example .env

# 4. Edit .env and add your API keys
# Use notepad or your preferred editor
notepad .env

# 5. Install dependencies
npm install

# 6. Rebuild better-sqlite3 for Electron (if you get MODULE_VERSION error)
npm run rebuild

# 7. Start the application
npm run dev
```

### Setting Up .env File

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

### Windows Troubleshooting

#### Error: "C++20 or later required" during npm install

**Problem**: You're using Node.js v23.x which requires C++20, but better-sqlite3 doesn't support it yet.

**Solution - Downgrade to Node.js LTS:**

1. Uninstall Node.js v23.x:
   - Go to Settings → Apps → Node.js → Uninstall
2. Download Node.js 20.x LTS from https://nodejs.org/
3. Install and verify:
   ```cmd
   node --version
   ```
   Should show v20.x.x
4. Run installation again:
   ```cmd
   npm install
   ```

**Alternative - Use NVM for Windows:**
```cmd
REM Install nvm-windows from: https://github.com/coreybutler/nvm-windows
nvm install 20
nvm use 20
npm install
```

#### Error: "MSBuild.exe failed with exit code: 1"

**Problem**: Missing Visual Studio Build Tools

**Solution:**
```powershell
# Run PowerShell as Administrator
npm install --global windows-build-tools

# OR download and install Visual Studio Build Tools manually:
# https://visualstudio.microsoft.com/downloads/
# Select "Desktop development with C++" workload
```

#### Error: "EPERM: operation not permitted"

**Problem**: Windows file locking during installation

**Solution:**
```cmd
REM 1. Close all applications using the project folder

REM 2. Delete node_modules folder
rmdir /s /q node_modules

REM 3. Clear npm cache
npm cache clean --force

REM 4. Try installing again
npm install
```

#### Python 3.13 Compatibility Issues

**Problem**: better-sqlite3 doesn't support Python 3.13 yet

**Solution:**
1. Install Python 3.12 from https://www.python.org/downloads/
2. Set environment variable to point to Python 3.12:
   ```powershell
   # PowerShell (as Administrator)
   [System.Environment]::SetEnvironmentVariable('PYTHON', 'C:\Python312\python.exe', 'Machine')
   ```
3. Restart your terminal
4. Run `npm run rebuild` again

#### Still Having Issues?

If you continue to have problems:

1. **Verify Node.js version** (MUST be 18.x, 20.x, or 22.x):
   ```cmd
   node --version
   ```

2. **Verify Visual Studio Build Tools**:
   ```cmd
   npm config get msvs_version
   ```

3. **Try installing better-sqlite3 separately**:
   ```cmd
   npm install better-sqlite3@9.2.2 --build-from-source
   ```

4. **Report the issue**:
   https://github.com/EnragedAntelope/autotrader/issues

---

## Getting Your API Keys

### Alpaca API Keys

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

### Alpha Vantage API Key (Optional)

1. Visit [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
2. Enter your email and click "GET FREE API KEY"
3. Copy the key to your `.env` file

**Note**: Free tier is limited to 25 requests/day and 5 requests/minute.

---

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

---

## General Troubleshooting

### Electron Security Warning (CSP) - EXPECTED IN DEV MODE

**Warning**: "Electron Security Warning (Insecure Content-Security-Policy)"

**This is NORMAL and EXPECTED in development mode!**

**Explanation**:
- Vite's Hot Module Replacement (HMR) requires `'unsafe-eval'` in development
- This warning will **NOT** appear in production builds
- The warning message itself states: "This warning will not show up once the app is packaged"
- Production builds use a strict CSP without `'unsafe-eval'`

**Action**: You can safely ignore this warning during development. No fix is needed.

### API Key Errors

**Error**: "Missing Alpaca API credentials"

**Solution**:
- Verify `.env` file exists in project root
- Check that key names match exactly (ALPACA_PAPER_API_KEY, etc.)
- Ensure no extra spaces or quotes around keys
- Restart the application after editing `.env`

### Database Errors

**Error**: "Database access error"

**Solution**:
- Close the application completely
- Delete the database file (location: user data directory)
- Restart the application (database will be recreated)

### Market Data Not Loading

**Error**: "Failed to get market data"

**Solutions**:
- Check internet connection
- Verify API keys are valid
- Check if you've exceeded Alpha Vantage rate limits (25/day)
- Wait a few minutes and try again

---

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

---

## Usage Guide

### First Run

1. Launch the application
2. Verify you're in **PAPER TRADING** mode (green indicator in top bar)
3. Check that your account info loads correctly
4. Explore the Dashboard to see account summary and P/L statistics

### Creating a Screening Profile

1. Navigate to **Screener Builder**
2. Click "Load Template" to start with a pre-built profile (recommended)
3. Enter a name for your profile
4. Select asset type (Stock, Call Option, or Put Option)
5. Set your screening parameters (use help tooltips for guidance)
6. Click "Test Scan" to preview results
7. Configure automation settings if desired
8. Save the profile

### Risk Management Settings

1. Navigate to **Risk Management**
2. Configure your limits (transaction, daily, weekly)
3. Set default stop-loss and take-profit percentages
4. Save settings

### Running Scans

**Manual Scan**: Open a profile and click "Run Scan Now"

**Automated Scanning**: Enable scheduling on a profile and start the global scheduler

### Backtesting Strategies

1. Navigate to **Backtesting**
2. Select a screening profile
3. Choose date range and capital settings
4. Click "Run Backtest"
5. Review performance metrics and trade history

---

## Implementation Status

### ✅ All Phases Complete!

- **Phase 1**: Foundation (Electron, React, Database, API integration)
- **Phase 2**: Rate Limiting & Core Services (Screening, Trading, Scheduling)
- **Phase 3**: UI Components & Options Support (All screens + options trading)
- **Phase 4**: Position Monitoring & Automation (Stop-loss, Take-profit, Auto-execution)
- **Phase 5**: Enhanced Screening & Backtesting (45+ parameters, Templates, Strategy validation)
- **Phase 6**: Polish & User Experience (Dark theme, Enhanced UI)

**Total**: ~15,000 lines of production-ready code

---

## Security Notes

- API keys stored locally in `.env` file (never committed)
- All API calls made from Electron main process
- IPC bridge only exposes necessary functions
- Context isolation enabled for security
- Content Security Policy enforced in production

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues or questions:
- Open an issue on GitHub: https://github.com/EnragedAntelope/autotrader/issues
- Review documentation and troubleshooting sections above

---

**Remember**: Always start with paper trading, set appropriate risk limits, and never trade with money you can't afford to lose.
