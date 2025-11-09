import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  PlayArrow as RunIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  Assessment as ChartIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ScreeningProfile } from '../types';

interface BacktestResults {
  profile: string;
  startDate: Date;
  endDate: Date;
  initialCapital: number;
  finalCapital: number;
  trades: any[];
  metrics: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: number;
    returnPercent: number;
    avgWin: number;
    avgLoss: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    avgHoldingDays: number;
  };
}

function Backtesting() {
  const [profiles, setProfiles] = useState<ScreeningProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<number | ''>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [positionSize, setPositionSize] = useState<number>(1000);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResults | null>(null);

  useEffect(() => {
    loadProfiles();

    // Set default dates (last 6 months)
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const loadProfiles = async () => {
    try {
      const profileList = await window.electron.getProfiles();
      setProfiles(profileList);
    } catch (err: any) {
      setError(`Failed to load profiles: ${err.message}`);
    }
  };

  const handleRunBacktest = async () => {
    if (!selectedProfile) {
      setError('Please select a profile');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select start and end dates');
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const backtestResults = await window.electron.runBacktest(
        selectedProfile,
        startDate,
        endDate,
        initialCapital,
        positionSize
      );

      setResults(backtestResults);
    } catch (err: any) {
      console.error('Backtest error:', err);
      setError(`Backtest failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Strategy Backtesting
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
        Test your screening profiles against historical data to evaluate performance
      </Typography>

      {/* DATA SOURCE WARNING */}
      <Alert
        severity={process.env.ALPHA_VANTAGE_API_KEY ? 'info' : 'warning'}
        icon={<WarningIcon />}
        sx={{
          mb: 3,
          '& .MuiAlert-icon': {
            fontSize: '28px',
          },
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          {process.env.ALPHA_VANTAGE_API_KEY
            ? 'REAL DATA BACKTESTING (Alpha Vantage)'
            : 'SIMULATED DATA WARNING'}
        </Typography>
        <Typography variant="body2">
          {process.env.ALPHA_VANTAGE_API_KEY
            ? 'This backtesting engine will use real historical price data from Alpha Vantage. Note: This will consume API calls (approximately 5-10 calls per backtest run).'
            : 'Without an Alpha Vantage API key configured, backtesting uses simulated random data for demonstration only. Results are NOT indicative of actual historical performance. Configure your Alpha Vantage API key in Settings (.env file) to enable real historical data backtesting.'}
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Backtest Configuration
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Profile</InputLabel>
              <Select
                value={selectedProfile}
                label="Select Profile"
                onChange={(e) => setSelectedProfile(e.target.value as number)}
              >
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name} ({profile.asset_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Initial Capital"
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 10000)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 1000, max: 1000000, step: 1000 }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Position Size"
              type="number"
              value={positionSize}
              onChange={(e) => setPositionSize(parseFloat(e.target.value) || 1000)}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              inputProps={{ min: 100, max: 100000, step: 100 }}
              helperText="Amount to invest per trade"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <RunIcon />}
              onClick={handleRunBacktest}
              disabled={loading || !selectedProfile}
              fullWidth
            >
              {loading ? 'Running Backtest...' : 'Run Backtest'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Results */}
      {results && (
        <>
          {/* Data Source Indicator */}
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Backtest Results</Typography>
            <Chip
              label={results.dataSource === 'real' ? 'REAL DATA' : 'SIMULATED DATA'}
              color={results.dataSource === 'real' ? 'success' : 'warning'}
              size="small"
              sx={{ fontWeight: 'bold' }}
            />
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Return
                  </Typography>
                  <Typography
                    variant="h4"
                    color={results.metrics.returnPercent >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatPercent(results.metrics.returnPercent)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatCurrency(results.metrics.totalProfitLoss)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Win Rate
                  </Typography>
                  <Typography variant="h4">
                    {results.metrics.winRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {results.metrics.winningTrades}W / {results.metrics.losingTrades}L
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Sharpe Ratio
                  </Typography>
                  <Typography variant="h4">
                    {results.metrics.sharpeRatio.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Risk-adjusted return
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Max Drawdown
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {results.metrics.maxDrawdown.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Largest peak-to-trough decline
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Metrics */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Total Trades
                </Typography>
                <Typography variant="h6">{results.metrics.totalTrades}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Profit Factor
                </Typography>
                <Typography variant="h6">
                  {results.metrics.profitFactor.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Avg Holding Period
                </Typography>
                <Typography variant="h6">
                  {results.metrics.avgHoldingDays.toFixed(1)} days
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Avg Win
                </Typography>
                <Typography variant="h6" color="success.main">
                  {formatCurrency(results.metrics.avgWin)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Avg Loss
                </Typography>
                <Typography variant="h6" color="error.main">
                  {formatCurrency(results.metrics.avgLoss)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Typography variant="body2" color="textSecondary">
                  Final Capital
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(results.finalCapital)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Trade History */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Trade History ({results.trades.length} trades)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Entry Date</TableCell>
                    <TableCell>Exit Date</TableCell>
                    <TableCell align="right">Entry Price</TableCell>
                    <TableCell align="right">Exit Price</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">P/L</TableCell>
                    <TableCell align="right">Return</TableCell>
                    <TableCell>Days Held</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.trades.slice(0, 20).map((trade, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {trade.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(trade.entryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {new Date(trade.exitDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(trade.entryPrice)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(trade.exitPrice)}
                      </TableCell>
                      <TableCell align="right">{trade.quantity}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          color={trade.profitLoss >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatCurrency(trade.profitLoss)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={formatPercent(trade.profitLossPercent)}
                          size="small"
                          color={trade.profitLossPercent >= 0 ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{trade.holdingDays}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {results.trades.length > 20 && (
              <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                Showing first 20 of {results.trades.length} trades
              </Typography>
            )}
          </Paper>
        </>
      )}

      {/* Empty State */}
      {!results && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Ready to Backtest
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Configure your backtest parameters above and click "Run Backtest" to see how your strategy
            would have performed historically
          </Typography>
        </Paper>
      )}
    </Box>
  );
}

export default Backtesting;
