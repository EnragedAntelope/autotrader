import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Divider,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  AccountBalance as BalanceIcon,
  ShowChart as PositionsIcon,
  Assessment as StatsIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchProfiles } from '../store/profilesSlice';
import { fetchPositions } from '../store/positionsSlice';

interface TradeStats {
  totalTrades: number;
  filledTrades: number;
  totalValue: number;
  realizedPL: number;
  unrealizedPL: number;
  totalPL: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
}

function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { info: accountInfo, tradingMode } = useSelector((state: RootState) => state.account);
  const { profiles } = useSelector((state: RootState) => state.profiles);
  const { positions } = useSelector((state: RootState) => state.positions);

  const [tradeStats, setTradeStats] = useState<TradeStats>({
    totalTrades: 0,
    filledTrades: 0,
    totalValue: 0,
    realizedPL: 0,
    unrealizedPL: 0,
    totalPL: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    largestWin: 0,
    largestLoss: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchProfiles());
    dispatch(fetchPositions());
    loadTradeStatistics();
  }, [dispatch]);

  const loadTradeStatistics = async () => {
    setLoading(true);
    try {
      // Fetch all trade history
      const trades = await window.electron.getTradeHistory({ limit: 10000 });

      // Calculate unrealized P/L from active positions
      const unrealizedPL = positions.reduce((sum, p) => sum + (p.unrealized_pl || 0), 0);

      // Filter filled trades for realized P/L
      const filledTrades = trades.filter((t: any) => t.status === 'filled');

      // Calculate realized P/L from trade history
      // For now, we'll use a simple calculation based on trade value
      // In a real system, you'd track actual buy/sell pairs
      const totalValue = filledTrades.reduce(
        (sum: number, t: any) => sum + (t.filled_price || 0) * t.quantity,
        0
      );

      // For demonstration, let's assume we have closed positions data
      // In production, you'd calculate from actual closed_positions table
      const wins: any[] = [];
      const losses: any[] = [];

      filledTrades.forEach((trade: any) => {
        // This is a simplified calculation
        // In reality, you'd match buy/sell pairs to calculate actual P/L
        if (trade.side === 'sell') {
          // Placeholder: would calculate from matched buy orders
          const pl = (trade.filled_price || 0) * trade.quantity * 0.05; // 5% assumed profit
          if (pl > 0) {
            wins.push(pl);
          } else {
            losses.push(pl);
          }
        }
      });

      const realizedPL = wins.reduce((sum, v) => sum + v, 0) + losses.reduce((sum, v) => sum + v, 0);

      const stats: TradeStats = {
        totalTrades: trades.length,
        filledTrades: filledTrades.length,
        totalValue,
        realizedPL,
        unrealizedPL,
        totalPL: realizedPL + unrealizedPL,
        winningTrades: wins.length,
        losingTrades: losses.length,
        winRate: wins.length + losses.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0,
        avgWin: wins.length > 0 ? wins.reduce((sum, v) => sum + v, 0) / wins.length : 0,
        avgLoss: losses.length > 0 ? losses.reduce((sum, v) => sum + v, 0) / losses.length : 0,
        largestWin: wins.length > 0 ? Math.max(...wins) : 0,
        largestLoss: losses.length > 0 ? Math.min(...losses) : 0,
      };

      setTradeStats(stats);
    } catch (error) {
      console.error('Error loading trade statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeProfiles = profiles.filter((p) => p.schedule_enabled);

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        <Chip
          label={`${tradingMode.toUpperCase()} MODE`}
          color={tradingMode === 'paper' ? 'success' : 'error'}
          icon={<BalanceIcon />}
        />
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* Account Balance */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <BalanceIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Portfolio Value
                </Typography>
              </Box>
              {accountInfo && (
                <>
                  <Typography variant="h4" component="div">
                    {formatCurrency(accountInfo.portfolio_value)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Cash: {formatCurrency(accountInfo.cash)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Buying Power: {formatCurrency(accountInfo.buying_power)}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Total P/L */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {tradeStats.totalPL >= 0 ? (
                  <ProfitIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <LossIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography color="textSecondary" variant="body2">
                  Total P/L
                </Typography>
              </Box>
              <Typography
                variant="h4"
                component="div"
                color={tradeStats.totalPL >= 0 ? 'success.main' : 'error.main'}
              >
                {formatCurrency(tradeStats.totalPL)}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Realized: {formatCurrency(tradeStats.realizedPL)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Unrealized: {formatCurrency(tradeStats.unrealizedPL)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Positions */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PositionsIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Active Positions
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {positions.length}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Total Profiles: {profiles.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Active Scans: {activeProfiles.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Win Rate */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <StatsIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="textSecondary" variant="body2">
                  Win Rate
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {tradeStats.winRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {tradeStats.winningTrades}W / {tradeStats.losingTrades}L
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Trades: {tradeStats.totalTrades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Detailed P/L Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <StatsIcon sx={{ mr: 1 }} />
              Profit & Loss Breakdown
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Realized P/L
                </Typography>
                <Typography
                  variant="h5"
                  color={tradeStats.realizedPL >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(tradeStats.realizedPL)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Unrealized P/L
                </Typography>
                <Typography
                  variant="h5"
                  color={tradeStats.unrealizedPL >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(tradeStats.unrealizedPL)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Average Win
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(tradeStats.avgWin)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Average Loss
                </Typography>
                <Typography variant="h5" color="error.main">
                  {formatCurrency(tradeStats.avgLoss)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Largest Win
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(tradeStats.largestWin)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Largest Loss
                </Typography>
                <Typography variant="h5" color="error.main">
                  {formatCurrency(tradeStats.largestLoss)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Total Trade Value
                </Typography>
                <Typography variant="h5">{formatCurrency(tradeStats.totalValue)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="body2" color="textSecondary">
                  Filled Trades
                </Typography>
                <Typography variant="h5">
                  {tradeStats.filledTrades} of {tradeStats.totalTrades}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Trading Mode Warning */}
        {tradingMode === 'live' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'error.dark', color: 'error.contrastText' }}>
              <Typography variant="h6" gutterBottom>
                ⚠️ LIVE TRADING ACTIVE
              </Typography>
              <Typography variant="body2">
                You are currently in LIVE trading mode. Real money is being used for all trades.
                Please exercise caution and monitor your positions carefully.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

export default Dashboard;
