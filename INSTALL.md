# Installation Instructions

## Quick Start

1. **Clone the repository** (if not already done)
   ```bash
   git clone <your-repo-url>
   cd alpaca-trading-scanner
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   If you encounter any issues with Electron installation, try:
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Alpaca API keys (see README.md for details)

4. **Run the application**
   ```bash
   npm run dev
   ```

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

## Troubleshooting

### Electron Installation Issues

If `npm install` fails with Electron download errors:

```bash
# Try with different npm registry
npm config set registry https://registry.npmjs.org/
npm install

# Or skip binary download temporarily
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install
```

### Database Not Created

The database will be automatically created on first launch in:
- Windows: `%APPDATA%/alpaca-trading-scanner/`
- macOS: `~/Library/Application Support/alpaca-trading-scanner/`
- Linux: `~/.config/alpaca-trading-scanner/`

### Port Already in Use

If Vite dev server port 5173 is in use:
```bash
# Edit vite.config.ts and change the port number
```

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
