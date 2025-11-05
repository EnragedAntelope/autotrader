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

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Alpaca Account**: Free paper trading account from [Alpaca Markets](https://alpaca.markets/)
- **Alpha Vantage API Key** (Optional): For fundamental data. Get free key from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd alpaca-trading-scanner
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up API Keys

Copy the example environment file:

```bash
cp .env.example .env
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

### 4. Getting Your Alpaca API Keys

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

### 5. Getting Alpha Vantage API Key (Optional)

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

## Phase 1 Status (Current)

✅ **Completed**:
- Project structure and build setup
- Electron + React integration
- SQLite database with full schema
- Alpaca API service
- Basic UI shell with Material-UI
- TypeScript type definitions
- Redux state management
- Account info display
- Trading mode switching

🚧 **To Be Implemented** (Later Phases):
- Phase 2: Complete screening engine
- Phase 3: Full scheduler implementation
- Phase 4: Trade execution
- Phase 5: Position monitoring automation
- Phase 6: Polish features (notifications, dark mode, backtesting)

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