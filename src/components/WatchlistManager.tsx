import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Paper,
  Alert,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  TrendingUp as TrendingIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';

interface Watchlist {
  id: number;
  name: string;
  description: string;
  is_default: number;
  symbols?: string[];
}

function WatchlistManager() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<Watchlist | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWatchlist, setEditingWatchlist] = useState<Watchlist | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    symbols: [] as string[],
  });
  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadWatchlists();
  }, []);

  const loadWatchlists = async () => {
    try {
      const data = await window.electron.getWatchlists();
      setWatchlists(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadWatchlistDetails = async (id: number) => {
    try {
      const data = await window.electron.getWatchlist(id);
      setSelectedWatchlist(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenDialog = (watchlist?: Watchlist) => {
    if (watchlist) {
      setEditingWatchlist(watchlist);
      setFormData({
        name: watchlist.name,
        description: watchlist.description || '',
        symbols: watchlist.symbols || [],
      });
    } else {
      setEditingWatchlist(null);
      setFormData({
        name: '',
        description: '',
        symbols: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingWatchlist(null);
    setNewSymbol('');
    setFormData({ name: '', description: '', symbols: [] });
  };

  const handleAddSymbol = () => {
    const symbol = newSymbol.trim().toUpperCase();
    if (symbol && !formData.symbols.includes(symbol)) {
      setFormData({
        ...formData,
        symbols: [...formData.symbols, symbol],
      });
      setNewSymbol('');
    }
  };

  const handleRemoveSymbol = (symbol: string) => {
    setFormData({
      ...formData,
      symbols: formData.symbols.filter((s) => s !== symbol),
    });
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!formData.name.trim()) {
        setError('Watchlist name is required');
        return;
      }

      if (editingWatchlist) {
        // Update existing
        await window.electron.updateWatchlist(editingWatchlist.id, formData);
        setSuccess('Watchlist updated successfully');
      } else {
        // Create new
        await window.electron.createWatchlist(formData);
        setSuccess('Watchlist created successfully');
      }

      handleCloseDialog();
      loadWatchlists();
      if (selectedWatchlist) {
        loadWatchlistDetails(selectedWatchlist.id);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this watchlist?')) {
      return;
    }

    try {
      await window.electron.deleteWatchlist(id);
      setSuccess('Watchlist deleted successfully');
      loadWatchlists();
      if (selectedWatchlist?.id === id) {
        setSelectedWatchlist(null);
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Watchlists</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          New Watchlist
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Watchlists List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              All Watchlists
            </Typography>
            {watchlists.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No watchlists found
              </Typography>
            ) : (
              <List>
                {watchlists.map((watchlist) => (
                  <ListItem
                    key={watchlist.id}
                    button
                    selected={selectedWatchlist?.id === watchlist.id}
                    onClick={() => loadWatchlistDetails(watchlist.id)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{watchlist.name}</Typography>
                          {watchlist.is_default === 1 && (
                            <Chip label="Default" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={watchlist.description}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit">
                        <Box component="span" sx={{ display: 'inline-flex' }}>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadWatchlistDetails(watchlist.id).then(() => {
                                handleOpenDialog(watchlist);
                              });
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Box>
                      </Tooltip>
                      <Tooltip title={watchlist.is_default === 1 ? 'Cannot delete default watchlist' : 'Delete'}>
                        <Box component="span" sx={{ display: 'inline-flex' }}>
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(watchlist.id);
                            }}
                            disabled={watchlist.is_default === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Watchlist Details */}
        <Grid item xs={12} md={8}>
          {selectedWatchlist ? (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6">{selectedWatchlist.name}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedWatchlist.description}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenDialog(selectedWatchlist)}
                >
                  Edit
                </Button>
              </Box>

              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Symbols ({selectedWatchlist.symbols?.length || 0})
              </Typography>

              {selectedWatchlist.symbols && selectedWatchlist.symbols.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedWatchlist.symbols.map((symbol) => (
                    <Chip key={symbol} label={symbol} variant="outlined" />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No symbols in this watchlist
                </Typography>
              )}
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <BusinessIcon sx={{ fontSize: 64, color: 'action.disabled', mb: 2 }} />
              <Typography variant="body1" color="textSecondary">
                Select a watchlist to view details
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingWatchlist ? 'Edit Watchlist' : 'Create New Watchlist'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Watchlist Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
            />

            <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
              Symbols
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                label="Add Symbol"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSymbol();
                  }
                }}
                placeholder="e.g., AAPL"
                size="small"
              />
              <Button variant="outlined" onClick={handleAddSymbol}>
                Add
              </Button>
            </Box>

            {formData.symbols.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.symbols.map((symbol) => (
                  <Chip
                    key={symbol}
                    label={symbol}
                    onDelete={() => handleRemoveSymbol(symbol)}
                  />
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {editingWatchlist ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WatchlistManager;
