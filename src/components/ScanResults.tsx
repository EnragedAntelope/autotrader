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
  IconButton,
  Chip,
  TextField,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Info as InfoIcon,
  ShoppingCart as TradeIcon,
} from '@mui/icons-material';
import { ScanResult, ScreeningProfile, AssetType, ScanResultFilters } from '../types';

interface ExtendedScanResult extends ScanResult {
  profile_name?: string;
}

function ScanResults() {
  const [results, setResults] = useState<ExtendedScanResult[]>([]);
  const [profiles, setProfiles] = useState<ScreeningProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filters
  const [filters, setFilters] = useState<ScanResultFilters>({
    profileId: undefined,
    symbol: '',
    fromDate: '',
    toDate: '',
    assetType: undefined,
    limit: 500,
  });

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; result: ExtendedScanResult | null }>({
    open: false,
    result: null,
  });

  // Trade dialog
  const [tradeDialog, setTradeDialog] = useState<{
    open: boolean;
    result: ExtendedScanResult | null;
    quantity: number;
  }>({
    open: false,
    result: null,
    quantity: 100,
  });

  useEffect(() => {
    loadProfiles();
    loadResults();
  }, []);

  const loadProfiles = async () => {
    try {
      const profileList = await window.electron.getProfiles();
      setProfiles(profileList);
    } catch (err: any) {
      console.error('Failed to load profiles:', err);
    }
  };

  const loadResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const scanResults = await window.electron.getAllScanResults(filters);
      setResults(scanResults);
    } catch (err: any) {
      setError(`Failed to load scan results: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof ScanResultFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value === '' ? undefined : value }));
  };

  const handleApplyFilters = () => {
    setPage(0);
    loadResults();
  };

  const handleClearFilters = () => {
    setFilters({
      profileId: undefined,
      symbol: '',
      fromDate: '',
      toDate: '',
      assetType: undefined,
      limit: 500,
    });
    setPage(0);
    setTimeout(loadResults, 100);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (result: ExtendedScanResult) => {
    setDetailDialog({ open: true, result });
  };

  const handleOpenTradeDialog = (result: ExtendedScanResult) => {
    setTradeDialog({ open: true, result, quantity: 100 });
  };

  const handleExecuteTrade = async () => {
    if (!tradeDialog.result) return;

    setLoading(true);
    try {
      const result = await window.electron.executeTrade({
        symbol: tradeDialog.result.symbol,
        quantity: tradeDialog.quantity,
        side: 'buy',
        order_type: 'market',
        profile_id: tradeDialog.result.profile_id,
      });

      if (result.success) {
        setSuccess(`Successfully placed order for ${tradeDialog.result.symbol}`);
        setTradeDialog({ open: false, result: null, quantity: 100 });
      } else if (result.rejected) {
        setError(`Trade rejected: ${result.reason}`);
      }
    } catch (err: any) {
      setError(`Failed to execute trade: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null || isNaN(price)) {
      return 'N/A';
    }
    return `$${price.toFixed(2)}`;
  };

  const formatPercent = (percent: number | undefined | null) => {
    if (percent === undefined || percent === null || isNaN(percent)) {
      return 'N/A';
    }
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getAssetTypeColor = (assetType: AssetType): 'primary' | 'success' | 'error' => {
    switch (assetType) {
      case 'stock':
        return 'primary';
      case 'call_option':
        return 'success';
      case 'put_option':
        return 'error';
    }
  };

  const getAssetTypeLabel = (assetType: AssetType): string => {
    switch (assetType) {
      case 'stock':
        return 'Stock';
      case 'call_option':
        return 'Call';
      case 'put_option':
        return 'Put';
    }
  };

  // Paginated results
  const paginatedResults = results.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Scan Results</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadResults} disabled={loading}>
          Refresh
        </Button>
      </Box>

      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filters
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Profile</InputLabel>
              <Select
                value={filters.profileId || ''}
                label="Profile"
                onChange={(e) => handleFilterChange('profileId', e.target.value)}
              >
                <MenuItem value="">All Profiles</MenuItem>
                {profiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Symbol"
              value={filters.symbol}
              onChange={(e) => handleFilterChange('symbol', e.target.value)}
              placeholder="e.g. AAPL"
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Asset Type</InputLabel>
              <Select
                value={filters.assetType || ''}
                label="Asset Type"
                onChange={(e) => handleFilterChange('assetType', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="stock">Stock</MenuItem>
                <MenuItem value="call_option">Call Option</MenuItem>
                <MenuItem value="put_option">Put Option</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="From Date"
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              label="To Date"
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={handleApplyFilters} disabled={loading}>
            Apply Filters
          </Button>
          <Button variant="outlined" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Results Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Profile</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Asset Type</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Change</TableCell>
              <TableCell align="right">Volume</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="textSecondary" sx={{ py: 4 }}>
                    {loading ? 'Loading...' : 'No scan results found. Try adjusting your filters or run some scans.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedResults.map((result) => (
                <TableRow key={result.id} hover>
                  <TableCell>{formatTimestamp(result.scan_timestamp)}</TableCell>
                  <TableCell>{result.profile_name || `Profile #${result.profile_id}`}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {result.symbol}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getAssetTypeLabel(result.asset_type)}
                      color={getAssetTypeColor(result.asset_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">{formatPrice(result.market_data_snapshot?.price)}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {result.market_data_snapshot?.changePercent !== undefined && result.market_data_snapshot.changePercent > 0 ? (
                        <TrendingUpIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />
                      ) : result.market_data_snapshot?.changePercent !== undefined ? (
                        <TrendingDownIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />
                      ) : null}
                      <Typography
                        variant="body2"
                        color={result.market_data_snapshot?.changePercent !== undefined && result.market_data_snapshot.changePercent > 0 ? 'success.main' : 'error.main'}
                      >
                        {formatPercent(result.market_data_snapshot?.changePercent)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {result.market_data_snapshot?.volume !== undefined && result.market_data_snapshot.volume !== null
                      ? result.market_data_snapshot.volume.toLocaleString()
                      : 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="View Details">
                      <IconButton size="small" onClick={() => handleViewDetails(result)}>
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Quick Trade">
                      <IconButton size="small" color="primary" onClick={() => handleOpenTradeDialog(result)}>
                        <TradeIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={results.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, result: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Scan Result Details</DialogTitle>
        <DialogContent>
          {detailDialog.result && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {detailDialog.result.symbol}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Profile:
                        </Typography>
                        <Typography variant="body1">
                          {detailDialog.result.profile_name || `Profile #${detailDialog.result.profile_id}`}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Scan Time:
                        </Typography>
                        <Typography variant="body1">{formatTimestamp(detailDialog.result.scan_timestamp)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Asset Type:
                        </Typography>
                        <Chip
                          label={getAssetTypeLabel(detailDialog.result.asset_type)}
                          color={getAssetTypeColor(detailDialog.result.asset_type)}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Market Data
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Price:
                        </Typography>
                        <Typography variant="body1">
                          {formatPrice(detailDialog.result.market_data_snapshot.price)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Change:
                        </Typography>
                        <Typography
                          variant="body1"
                          color={detailDialog.result.market_data_snapshot.changePercent > 0 ? 'success.main' : 'error.main'}
                        >
                          {formatPercent(detailDialog.result.market_data_snapshot.changePercent)}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="textSecondary">
                          Volume:
                        </Typography>
                        <Typography variant="body1">
                          {detailDialog.result.market_data_snapshot.volume.toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {detailDialog.result.market_data_snapshot.fundamentals && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Fundamentals
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            P/E Ratio:
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.result.market_data_snapshot.fundamentals.pe.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            Market Cap:
                          </Typography>
                          <Typography variant="body1">
                            ${(detailDialog.result.market_data_snapshot.fundamentals.marketCap / 1e9).toFixed(2)}B
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            Sector:
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.result.market_data_snapshot.fundamentals.sector}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            Beta:
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.result.market_data_snapshot.fundamentals.beta.toFixed(2)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}

              {detailDialog.result.market_data_snapshot.technical && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Technical Indicators
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            RSI:
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.result.market_data_snapshot.technical.rsi.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            MACD:
                          </Typography>
                          <Typography variant="body1">
                            {detailDialog.result.market_data_snapshot.technical.macd.value.toFixed(2)}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            SMA 20:
                          </Typography>
                          <Typography variant="body1">
                            {formatPrice(detailDialog.result.market_data_snapshot.technical.sma20)}
                          </Typography>
                        </Grid>
                        <Grid item xs={3}>
                          <Typography variant="body2" color="textSecondary">
                            SMA 50:
                          </Typography>
                          <Typography variant="body1">
                            {formatPrice(detailDialog.result.market_data_snapshot.technical.sma50)}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, result: null })}>Close</Button>
          {detailDialog.result && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setDetailDialog({ open: false, result: null });
                handleOpenTradeDialog(detailDialog.result!);
              }}
            >
              Trade
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Trade Dialog */}
      <Dialog open={tradeDialog.open} onClose={() => setTradeDialog({ open: false, result: null, quantity: 100 })}>
        <DialogTitle>Execute Trade</DialogTitle>
        <DialogContent>
          {tradeDialog.result && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="body1" gutterBottom>
                Symbol: <strong>{tradeDialog.result.symbol}</strong>
              </Typography>
              <Typography variant="body1" gutterBottom>
                Current Price: <strong>{formatPrice(tradeDialog.result.market_data_snapshot.price)}</strong>
              </Typography>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={tradeDialog.quantity}
                onChange={(e) => setTradeDialog((prev) => ({ ...prev, quantity: parseInt(e.target.value) }))}
                sx={{ mt: 2 }}
                InputProps={{ inputProps: { min: 1 } }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Estimated Cost: {formatPrice(tradeDialog.result.market_data_snapshot.price * tradeDialog.quantity)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTradeDialog({ open: false, result: null, quantity: 100 })}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleExecuteTrade} disabled={loading}>
            Buy Now (Market Order)
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ScanResults;
