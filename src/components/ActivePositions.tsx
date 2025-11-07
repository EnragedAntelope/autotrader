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
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Edit as EditIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  ShowChart as ChartIcon,
} from '@mui/icons-material';

interface Position {
  id: number;
  symbol: string;
  quantity: number;
  avg_cost: number;
  current_value: number | null;
  current_price: number | null;
  stop_loss_percent: number | null;
  take_profit_percent: number | null;
  unrealized_pl: number | null;
  unrealized_pl_percent: number | null;
  opened_at: string;
  last_updated: string;
}

interface PositionStats {
  totalPositions: number;
  totalValue: number;
  totalUnrealizedPL: number;
  winnersCount: number;
  losersCount: number;
}

interface EditDialogData {
  position: Position | null;
  stopLoss: string;
  takeProfit: string;
}

function ActivePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogData>({
    position: null,
    stopLoss: '',
    takeProfit: '',
  });
  const [stats, setStats] = useState<PositionStats>({
    totalPositions: 0,
    totalValue: 0,
    totalUnrealizedPL: 0,
    winnersCount: 0,
    losersCount: 0,
  });

  const loadPositions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electron.getPositions();
      setPositions(result);

      // Calculate stats
      const newStats: PositionStats = {
        totalPositions: result.length,
        totalValue: result.reduce((sum: number, p: Position) => sum + (p.current_value || 0), 0),
        totalUnrealizedPL: result.reduce((sum: number, p: Position) => sum + (p.unrealized_pl || 0), 0),
        winnersCount: result.filter((p: Position) => (p.unrealized_pl || 0) > 0).length,
        losersCount: result.filter((p: Position) => (p.unrealized_pl || 0) < 0).length,
      };

      setStats(newStats);
    } catch (err: any) {
      console.error('Error loading positions:', err);
      setError(err.message || 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPositions();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadPositions, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleOpenEditDialog = (position: Position) => {
    setEditDialog({
      position,
      stopLoss: position.stop_loss_percent?.toString() || '',
      takeProfit: position.take_profit_percent?.toString() || '',
    });
  };

  const handleCloseEditDialog = () => {
    setEditDialog({
      position: null,
      stopLoss: '',
      takeProfit: '',
    });
  };

  const handleSavePosition = async () => {
    if (!editDialog.position) return;

    try {
      const updates = {
        stop_loss_percent: parseFloat(editDialog.stopLoss) || null,
        take_profit_percent: parseFloat(editDialog.takeProfit) || null,
      };

      await window.electron.updatePosition(editDialog.position.id, updates);
      handleCloseEditDialog();
      loadPositions();
    } catch (err: any) {
      console.error('Error updating position:', err);
      setError(err.message || 'Failed to update position');
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return 'N/A';
    return `$${price.toFixed(2)}`;
  };

  const formatPercent = (percent: number | null) => {
    if (percent === null || percent === undefined) return 'N/A';
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
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

  const getPLColor = (pl: number | null) => {
    if (pl === null || pl === undefined || pl === 0) return 'textSecondary';
    return pl > 0 ? 'success.main' : 'error.main';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Active Positions</Typography>
        <Tooltip title="Refresh">
          <Box component="span" sx={{ display: 'inline-flex' }}>
            <IconButton onClick={loadPositions} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Tooltip>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Open Positions
              </Typography>
              <Typography variant="h4">{stats.totalPositions}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Chip
                  icon={<ProfitIcon />}
                  label={`${stats.winnersCount} Winning`}
                  size="small"
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<LossIcon />}
                  label={`${stats.losersCount} Losing`}
                  size="small"
                  color="error"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Position Value
              </Typography>
              <Typography variant="h4">${stats.totalValue.toFixed(2)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Unrealized P/L
              </Typography>
              <Typography
                variant="h4"
                color={getPLColor(stats.totalUnrealizedPL)}
              >
                {stats.totalUnrealizedPL >= 0 ? '+' : ''}${stats.totalUnrealizedPL.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Auto-Monitoring
              </Typography>
              <Typography variant="h6" color="success.main">
                ACTIVE
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Stop-loss/Take-profit monitoring
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Positions are automatically monitored for stop-loss and take-profit triggers. Data refreshes
        every 30 seconds, or click the refresh button for manual updates.
      </Alert>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && positions.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : positions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ChartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Active Positions
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Open positions will appear here after executing trades. They will be automatically
            monitored for stop-loss and take-profit triggers.
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Positions Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Avg Cost</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Current Value</TableCell>
                  <TableCell align="right">Unrealized P/L</TableCell>
                  <TableCell align="center">Stop Loss</TableCell>
                  <TableCell align="center">Take Profit</TableCell>
                  <TableCell>Opened</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.map((position) => {
                  const plValue = position.unrealized_pl || 0;
                  const plPercent = position.unrealized_pl_percent || 0;

                  return (
                    <TableRow
                      key={position.id}
                      hover
                      sx={{
                        '&:hover': { backgroundColor: 'action.hover' },
                        backgroundColor:
                          plValue > 0
                            ? 'success.50'
                            : plValue < 0
                            ? 'error.50'
                            : 'background.paper',
                      }}
                    >
                      <TableCell>
                        <Typography variant="body1" fontWeight="bold">
                          {position.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{position.quantity}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{formatPrice(position.avg_cost)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatPrice(position.current_price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatPrice(position.current_value)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={getPLColor(plValue)}
                          >
                            {plValue >= 0 ? '+' : ''}${plValue.toFixed(2)}
                          </Typography>
                          <Typography
                            variant="caption"
                            color={getPLColor(plPercent)}
                            sx={{ display: 'block' }}
                          >
                            {formatPercent(plPercent)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        {position.stop_loss_percent ? (
                          <Chip
                            label={`${position.stop_loss_percent}%`}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            Not set
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {position.take_profit_percent ? (
                          <Chip
                            label={`${position.take_profit_percent}%`}
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="caption" color="textSecondary">
                            Not set
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDateTime(position.opened_at)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Updated: {formatDateTime(position.last_updated)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit Stop-Loss/Take-Profit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(position)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Edit Position Dialog */}
      <Dialog open={!!editDialog.position} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit Position: {editDialog.position?.symbol}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Configure automatic stop-loss and take-profit levels for this position.
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stop Loss %"
                  type="number"
                  value={editDialog.stopLoss}
                  onChange={(e) =>
                    setEditDialog({ ...editDialog, stopLoss: e.target.value })
                  }
                  helperText="e.g., 5 = sell at 5% loss"
                  InputProps={{
                    endAdornment: <Typography>%</Typography>,
                  }}
                  inputProps={{
                    step: 0.5,
                    min: 0,
                    max: 100,
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Take Profit %"
                  type="number"
                  value={editDialog.takeProfit}
                  onChange={(e) =>
                    setEditDialog({ ...editDialog, takeProfit: e.target.value })
                  }
                  helperText="e.g., 10 = sell at 10% gain"
                  InputProps={{
                    endAdornment: <Typography>%</Typography>,
                  }}
                  inputProps={{
                    step: 0.5,
                    min: 0,
                    max: 1000,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info">
                  Leave empty to disable automatic triggers for this position.
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleSavePosition} variant="contained" color="primary">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ActivePositions;
