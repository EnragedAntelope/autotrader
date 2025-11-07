import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
} from '@mui/icons-material';

interface Trade {
  id: number;
  profile_id: number | null;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  order_type: string;
  limit_price: number | null;
  filled_price: number | null;
  status: 'pending' | 'filled' | 'rejected' | 'cancelled' | 'partial_fill';
  rejection_reason: string | null;
  order_id: string | null;
  executed_at: string;
  filled_at: string | null;
}

interface TradeStats {
  total: number;
  filled: number;
  rejected: number;
  cancelled: number;
  totalValue: number;
}

function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [symbolFilter, setSymbolFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState<TradeStats>({
    total: 0,
    filled: 0,
    rejected: 0,
    cancelled: 0,
    totalValue: 0,
  });

  const loadTrades = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filters
      const filters: any = {
        limit: 1000, // Get all recent trades for client-side filtering
      };

      // Add status filter if not 'all'
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      // Add date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        let fromDate: Date;

        switch (dateFilter) {
          case 'today':
            fromDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            fromDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            fromDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            fromDate = new Date(0); // All time
        }

        filters.from_date = fromDate.toISOString();
      }

      const result = await window.electron.getTradeHistory(filters);

      // Apply symbol filter client-side
      let filteredTrades = result;
      if (symbolFilter) {
        filteredTrades = result.filter((t: Trade) =>
          t.symbol.toLowerCase().includes(symbolFilter.toLowerCase())
        );
      }

      setTrades(filteredTrades);

      // Calculate stats
      const newStats: TradeStats = {
        total: filteredTrades.length,
        filled: filteredTrades.filter((t: Trade) => t.status === 'filled').length,
        rejected: filteredTrades.filter((t: Trade) => t.status === 'rejected').length,
        cancelled: filteredTrades.filter((t: Trade) => t.status === 'cancelled').length,
        totalValue: filteredTrades
          .filter((t: Trade) => t.status === 'filled' && t.filled_price)
          .reduce((sum: number, t: Trade) => sum + (t.filled_price! * t.quantity), 0),
      };

      setStats(newStats);
    } catch (err: any) {
      console.error('Error loading trade history:', err);
      setError(err.message || 'Failed to load trade history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrades();
  }, [statusFilter, dateFilter]);

  // Refresh when symbol filter changes (with debounce effect from typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (trades.length > 0 || symbolFilter === '') {
        loadTrades();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [symbolFilter]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'filled':
        return 'success';
      case 'rejected':
        return 'error';
      case 'cancelled':
        return 'warning';
      case 'pending':
        return 'info';
      case 'partial_fill':
        return 'primary';
      default:
        return 'default';
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Trade History</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={loadTrades} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Trades
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Filled
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.filled}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Rejected
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.rejected}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Value (Filled)
              </Typography>
              <Typography variant="h4">${stats.totalValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FilterIcon color="action" />
          <Typography variant="subtitle1" sx={{ mr: 2 }}>
            Filters:
          </Typography>

          <TextField
            label="Symbol"
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
            placeholder="e.g., AAPL"
          />

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="filled">Filled</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="partial_fill">Partial Fill</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateFilter}
              label="Date Range"
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <MenuItem value="all">All Time</MenuItem>
              <MenuItem value="today">Today</MenuItem>
              <MenuItem value="week">Past Week</MenuItem>
              <MenuItem value="month">Past Month</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : trades.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No trades found. Trades will appear here after you execute orders.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Trade Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Order Type</TableCell>
                  <TableCell align="right">Limit Price</TableCell>
                  <TableCell align="right">Filled Price</TableCell>
                  <TableCell align="right">Total Value</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Order ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trades
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((trade) => (
                    <TableRow
                      key={trade.id}
                      hover
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(trade.executed_at)}
                        </Typography>
                        {trade.filled_at && trade.filled_at !== trade.executed_at && (
                          <Typography variant="caption" color="textSecondary">
                            Filled: {formatDateTime(trade.filled_at)}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {trade.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.side.toUpperCase()}
                          color={trade.side === 'buy' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{trade.quantity}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {trade.order_type.replace('_', ' ')}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{formatPrice(trade.limit_price)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={trade.filled_price ? 'medium' : 'normal'}
                        >
                          {formatPrice(trade.filled_price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {trade.filled_price ? (
                          <Typography variant="body2" fontWeight="medium">
                            ${(trade.filled_price * trade.quantity).toFixed(2)}
                          </Typography>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.status.replace('_', ' ').toUpperCase()}
                          color={getStatusColor(trade.status)}
                          size="small"
                        />
                        {trade.rejection_reason && (
                          <Tooltip title={trade.rejection_reason}>
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{ display: 'block', mt: 0.5, cursor: 'help' }}
                            >
                              See reason
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        {trade.order_id ? (
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {trade.order_id.slice(0, 8)}...
                          </Typography>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={trades.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </>
      )}
    </Box>
  );
}

export default TradeHistory;
