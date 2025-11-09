import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Alert, Chip } from '@mui/material';
import { ExpandMore as ExpandIcon, Info as InfoIcon, Warning as WarningIcon, TipsAndUpdates as TipIcon } from '@mui/icons-material';

function Help() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Help & Important Tips
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Essential information for getting the most out of the trading scanner
      </Typography>

      {/* Critical Warnings */}
      <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          ⚠️ ALWAYS START WITH PAPER TRADING
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Never use live trading until you've thoroughly tested your strategies in paper mode for at least 30 days.
          Real money trading involves substantial risk of loss. The authors are not responsible for any financial losses.
        </Typography>
      </Alert>

      {/* API Configuration */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">API Configuration & Rate Limits</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ '& > *': { mb: 2 } }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Alpaca API Tiers
            </Typography>
            <Typography variant="body2">
              • <strong>Paper Trading (Free)</strong>: 200 requests/minute - perfect for testing
              <br />
              • <strong>Starter Plan ($9/mo)</strong>: 10,000 requests/minute - enables live trading
              <br />
              • <strong>Unlimited Data ($99/mo)</strong>: Enhanced data feeds for professional use
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
              Alpha Vantage API Tiers (for fundamentals & backtesting)
            </Typography>
            <Typography variant="body2">
              • <strong>Free Tier</strong>: 5 calls/minute, 25 calls/day - very limited, simulated backtesting only
              <br />
              • <strong>Premium ($49.99/mo)</strong>: 75 calls/minute, 500 calls/day - recommended for real backtesting
              <br />
              • <strong>Premium+ ($249.99/mo)</strong>: 600+ calls/day - for heavy screening with advanced fundamentals
            </Typography>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Recommendation:</strong> Start with free tiers to learn, upgrade to Alpaca Starter ($9/mo) when ready for live trading,
                and add Alpha Vantage Premium ($49.99/mo) only if you need real backtesting or advanced fundamental screening (ROE, ROA, Current Ratio, etc.).
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Stock Universe Screening */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Universal Stock Screening (ALL US STOCKS)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body2" paragraph>
              The "ALL US STOCKS (Universe Scanner)" watchlist scans ~10,000 tradable stocks from Alpaca.
            </Typography>

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Important:</strong> Universal screening is powerful but consumes significant API calls.
              </Typography>
            </Alert>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Best Practices:
            </Typography>
            <Typography variant="body2" component="div">
              • <strong>Use sector filtering</strong> to reduce stocks to manageable numbers (e.g., filter by "Technology" sector)
              <br />
              • <strong>Avoid advanced fundamentals</strong> (ROE, ROA, Current Ratio) on universal scans - each stock requires 2 extra API calls
              <br />
              • <strong>Start with price/volume filters</strong> which use free Alpaca data
              <br />
              • <strong>Test with smaller watchlists first</strong> to understand API consumption
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Backtesting */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Real vs Simulated Backtesting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Data Source Modes:
            </Typography>

            <Box sx={{ pl: 2, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Chip label="SIMULATED" color="warning" size="small" sx={{ mr: 1 }} />
                <Typography variant="body2" component="span">
                  <strong>Without Alpha Vantage API key:</strong> Uses random data (Math.random()) for demonstration only.
                  Results are <strong>NOT indicative of real performance</strong>.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip label="REAL DATA" color="success" size="small" sx={{ mr: 1 }} />
                <Typography variant="body2" component="span">
                  <strong>With Alpha Vantage API key:</strong> Uses actual historical OHLCV data (20+ years available).
                  Results reflect real market performance.
                </Typography>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>API Usage:</strong> Each 6-month backtest ≈ 5-10 Alpha Vantage API calls (with caching).
                Free tier (25 calls/day) limits you to ~3-5 backtests per day. Premium tier recommended for serious backtesting.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Advanced Fundamentals */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Advanced Fundamental Parameters</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body2" paragraph>
              The following parameters require additional Alpha Vantage API calls (INCOME_STATEMENT + BALANCE_SHEET):
            </Typography>

            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              • <strong>ROE (Return on Equity)</strong> - Net Income / Shareholder Equity
              <br />
              • <strong>ROA (Return on Assets)</strong> - Net Income / Total Assets
              <br />
              • <strong>Current Ratio</strong> - Current Assets / Current Liabilities
              <br />
              • <strong>Quick Ratio</strong> - (Current Assets - Inventory) / Current Liabilities
              <br />
              • <strong>Debt-to-Equity</strong> - Total Debt / Shareholder Equity
            </Typography>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Cost Impact:</strong> Each stock screened with these parameters adds 2 Alpha Vantage API calls.
                Scanning 50 stocks = 100 API calls (exceeds free tier daily limit of 25).
                Use these parameters selectively or upgrade to Premium tier.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Paper vs Live */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Paper vs Live Trading Mode</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body2" paragraph>
              The app maintains strict separation between paper and live trading:
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              What's Separated:
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              ✅ API credentials (separate keys for paper/live)
              <br />
              ✅ Account balances and buying power
              <br />
              ✅ Positions and trades
              <br />
              ✅ Statistics and P/L tracking
              <br />
              ✅ Risk limits (daily spend, position limits)
            </Typography>

            <Alert severity="success">
              <Typography variant="body2">
                <strong>Safety Note:</strong> It's architecturally impossible to accidentally execute live trades while in paper mode,
                or vice versa. Each mode uses completely different Alpaca API credentials.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Scheduler */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Automated Scheduler</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="body2" paragraph>
              The scheduler runs automated scans at specified intervals. It works on all operating systems (Windows, macOS, Linux).
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Important Notes:
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              • <strong>Market Hours Filter:</strong> Enable "Market Hours Only" to skip scans when market is closed
              <br />
              • <strong>API Rate Limits:</strong> Frequent scans (e.g., every 5 minutes) can quickly exhaust API limits
              <br />
              • <strong>App Must Be Running:</strong> The app must remain open for scheduled scans to execute
              <br />
              • <strong>Auto-Execute Caution:</strong> Only enable auto-execute for profiles you've thoroughly tested
            </Typography>

            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Recommendation:</strong> Start with 30-60 minute intervals to conserve API calls.
                Monitor your API usage in Settings before shortening intervals.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Risk Management */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <TipIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Risk Management Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Critical Limits to Configure:
            </Typography>
            <Typography variant="body2" component="div" sx={{ pl: 2, mb: 2 }}>
              • <strong>Max Amount Per Trade:</strong> Limits individual trade size (default: $1,000)
              <br />
              • <strong>Daily Spend Limit:</strong> Total amount you can trade per day (default: $5,000)
              <br />
              • <strong>Weekly Spend Limit:</strong> Total amount per week (default: $15,000)
              <br />
              • <strong>Max Open Positions:</strong> Limits total concurrent positions (default: 10)
              <br />
              • <strong>Stop-Loss %:</strong> Automatic exit when position drops X% (default: 5%)
              <br />
              • <strong>Take-Profit %:</strong> Automatic exit when position gains X% (default: 15%)
            </Typography>

            <Alert severity="error">
              <Typography variant="body2">
                <strong>CRITICAL:</strong> Always configure these limits BEFORE enabling auto-execute or live trading.
                These are your safety net against unexpected behavior or market volatility.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Troubleshooting */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandIcon />}>
          <InfoIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Common Issues & Solutions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              "Alpha Vantage rate limit exceeded"
            </Typography>
            <Typography variant="body2" sx={{ pl: 2, mb: 2 }}>
              • You've hit the free tier limit (5 calls/min or 25/day)
              <br />
              • Wait 24 hours or upgrade to Premium tier
              <br />
              • Avoid screening parameters that require fundamentals
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              "No matches found" repeatedly
            </Typography>
            <Typography variant="body2" sx={{ pl: 2, mb: 2 }}>
              • Your criteria may be too strict - try relaxing some parameters
              <br />
              • Check that watchlist contains appropriate symbols
              <br />
              • Verify market is open if using real-time data
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Backtesting shows unrealistic results
            </Typography>
            <Typography variant="body2" sx={{ pl: 2, mb: 2 }}>
              • Check if you're in SIMULATED mode (yellow warning)
              <br />
              • Configure Alpha Vantage API key for real data
              <br />
              • Simulated mode uses Math.random() - not useful for strategy validation
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Auto-execute not working
            </Typography>
            <Typography variant="body2" sx={{ pl: 2 }}>
              • Verify scheduler is running (check Settings)
              <br />
              • Ensure profile has "Auto-Execute" enabled
              <br />
              • Check risk limits aren't blocking trades
              <br />
              • Review trade history for error messages
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Getting Help */}
      <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.light' }}>
        <Typography variant="h6" gutterBottom>
          📚 Additional Resources
        </Typography>
        <Typography variant="body2" component="div">
          • <strong>Full Documentation:</strong> See <code>README.md</code> and <code>docs/</code> folder in the project directory
          <br />
          • <strong>API Coverage Details:</strong> <code>docs/API_COVERAGE_AND_LIMITATIONS.md</code>
          <br />
          • <strong>Rate Limiting Guide:</strong> <code>docs/RATE_LIMITING.md</code>
          <br />
          • <strong>Report Issues:</strong> <a href="https://github.com/EnragedAntelope/autotrader/issues" target="_blank" rel="noopener noreferrer">GitHub Issues</a>
          <br />
          • <strong>Update Checker:</strong> Check Settings to see if new version available
        </Typography>
      </Paper>
    </Box>
  );
}

export default Help;
