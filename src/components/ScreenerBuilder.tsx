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
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Help as HelpIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { AssetType, ScreeningProfile, StockParameters, OptionsParameters } from '../types';

interface ProfileFormData {
  name: string;
  asset_type: AssetType;
  parameters: StockParameters | OptionsParameters;
  schedule_enabled: boolean;
  schedule_interval: number;
  schedule_market_hours_only: boolean;
  auto_execute: boolean;
  max_transaction_amount: number;
}

const defaultStockParams: StockParameters = {
  priceMin: undefined,
  priceMax: undefined,
  volumeMin: undefined,
};

const defaultOptionsParams: OptionsParameters = {
  strikeMin: undefined,
  strikeMax: undefined,
  expirationMinDays: undefined,
  expirationMaxDays: undefined,
};

function ScreenerBuilder() {
  const [profiles, setProfiles] = useState<ScreeningProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<ScreeningProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testResultsOpen, setTestResultsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    asset_type: 'stock',
    parameters: defaultStockParams,
    schedule_enabled: false,
    schedule_interval: 15,
    schedule_market_hours_only: true,
    auto_execute: false,
    max_transaction_amount: 1000,
  });

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const profileList = await window.electron.getProfiles();
      setProfiles(profileList);
    } catch (err: any) {
      setError(`Failed to load profiles: ${err.message}`);
    }
  };

  const handleAssetTypeChange = (assetType: AssetType) => {
    setFormData({
      ...formData,
      asset_type: assetType,
      parameters: assetType === 'stock' ? { ...defaultStockParams } : { ...defaultOptionsParams },
    });
  };

  const handleParameterChange = (param: string, value: any) => {
    setFormData({
      ...formData,
      parameters: {
        ...formData.parameters,
        // Filter out empty strings and NaN values (from parseInt/parseFloat on empty fields)
        [param]: value === '' || (typeof value === 'number' && isNaN(value)) ? undefined : value,
      },
    });
  };

  const handleCreateNew = () => {
    setEditingProfile(null);
    setFormData({
      name: '',
      asset_type: 'stock',
      parameters: defaultStockParams,
      schedule_enabled: false,
      schedule_interval: 15,
      schedule_market_hours_only: true,
      auto_execute: false,
      max_transaction_amount: 1000,
    });
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (profile: ScreeningProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      asset_type: profile.asset_type,
      parameters: profile.parameters,
      // Explicitly convert to boolean to prevent type errors
      schedule_enabled: Boolean(profile.schedule_enabled),
      schedule_interval: profile.schedule_interval,
      schedule_market_hours_only: Boolean(profile.schedule_market_hours_only),
      auto_execute: Boolean(profile.auto_execute),
      max_transaction_amount: profile.max_transaction_amount || 1000,
    });
    setDialogOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      await window.electron.deleteProfile(id);
      setSuccess('Profile deleted successfully');
      loadProfiles();
    } catch (err: any) {
      setError(`Failed to delete profile: ${err.message}`);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.name.trim()) {
      setError('Profile name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingProfile) {
        await window.electron.updateProfile(editingProfile.id!, formData);
        setSuccess('Profile updated successfully');
      } else {
        await window.electron.createProfile(formData);
        setSuccess('Profile created successfully');
      }
      setDialogOpen(false);
      loadProfiles();
    } catch (err: any) {
      setError(`Failed to save profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestScan = async (profileId: number) => {
    setLoading(true);
    setError(null);
    try {
      const results = await window.electron.runScan(profileId);
      setTestResults(results);
      setTestResultsOpen(true);
      setSuccess(`Scan complete! Found ${results.length} match(es)`);
    } catch (err: any) {
      setError(`Failed to run scan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStockParameters = () => {
    const params = formData.parameters as StockParameters;

    return (
      <>
        {/* Price Filters */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Price Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Price"
                  type="number"
                  value={params.priceMin || ''}
                  onChange={(e) => handleParameterChange('priceMin', parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  helperText="Minimum stock price"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Price"
                  type="number"
                  value={params.priceMax || ''}
                  onChange={(e) => handleParameterChange('priceMax', parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  helperText="Maximum stock price"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Day Change %"
                  type="number"
                  value={params.dayChangeMin || ''}
                  onChange={(e) => handleParameterChange('dayChangeMin', parseFloat(e.target.value))}
                  InputProps={{
                    endAdornment: '%',
                  }}
                  helperText="Minimum daily percentage change"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Day Change %"
                  type="number"
                  value={params.dayChangeMax || ''}
                  onChange={(e) => handleParameterChange('dayChangeMax', parseFloat(e.target.value))}
                  InputProps={{
                    endAdornment: '%',
                  }}
                  helperText="Maximum daily percentage change"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Volume Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Volume Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Volume"
                  type="number"
                  value={params.volumeMin || ''}
                  onChange={(e) => handleParameterChange('volumeMin', parseInt(e.target.value))}
                  helperText="Minimum daily volume"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Avg Volume"
                  type="number"
                  value={params.avgVolumeMin || ''}
                  onChange={(e) => handleParameterChange('avgVolumeMin', parseInt(e.target.value))}
                  helperText="Minimum average volume (30-day)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Volume Ratio"
                  type="number"
                  value={params.volumeRatioMin || ''}
                  onChange={(e) => handleParameterChange('volumeRatioMin', parseFloat(e.target.value))}
                  helperText="Volume / Avg Volume ratio"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Technical Indicators */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Technical Indicators</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min RSI"
                  type="number"
                  value={params.rsiMin || ''}
                  onChange={(e) => handleParameterChange('rsiMin', parseFloat(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                  helperText="RSI 0-100 (oversold < 30, overbought > 70)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max RSI"
                  type="number"
                  value={params.rsiMax || ''}
                  onChange={(e) => handleParameterChange('rsiMax', parseFloat(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                  helperText="Maximum RSI value"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>MACD Signal</InputLabel>
                  <Select
                    value={params.macdSignal || 'any'}
                    onChange={(e) => handleParameterChange('macdSignal', e.target.value)}
                  >
                    <MenuItem value="any">Any</MenuItem>
                    <MenuItem value="bullish">Bullish (MACD &gt; Signal)</MenuItem>
                    <MenuItem value="bearish">Bearish (MACD &lt; Signal)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Fundamental Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Fundamental Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min P/E Ratio"
                  type="number"
                  value={params.peMin || ''}
                  onChange={(e) => handleParameterChange('peMin', parseFloat(e.target.value))}
                  helperText="Minimum price-to-earnings ratio"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max P/E Ratio"
                  type="number"
                  value={params.peMax || ''}
                  onChange={(e) => handleParameterChange('peMax', parseFloat(e.target.value))}
                  helperText="Maximum price-to-earnings ratio"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Market Cap (M)"
                  type="number"
                  value={params.marketCapMin || ''}
                  onChange={(e) => handleParameterChange('marketCapMin', parseFloat(e.target.value) * 1000000)}
                  helperText="Minimum market cap in millions"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Market Cap (M)"
                  type="number"
                  value={params.marketCapMax ? params.marketCapMax / 1000000 : ''}
                  onChange={(e) => handleParameterChange('marketCapMax', parseFloat(e.target.value) * 1000000)}
                  helperText="Maximum market cap in millions"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderOptionsParameters = () => {
    const params = formData.parameters as OptionsParameters;

    return (
      <>
        {/* Basic Options Filters */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Basic Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Strike Price"
                  type="number"
                  value={params.strikeMin || ''}
                  onChange={(e) => handleParameterChange('strikeMin', parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  helperText="Minimum strike price"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Strike Price"
                  type="number"
                  value={params.strikeMax || ''}
                  onChange={(e) => handleParameterChange('strikeMax', parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  helperText="Maximum strike price"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Days to Expiration"
                  type="number"
                  value={params.expirationMinDays || ''}
                  onChange={(e) => handleParameterChange('expirationMinDays', parseInt(e.target.value))}
                  helperText="Minimum days until expiration"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Days to Expiration"
                  type="number"
                  value={params.expirationMaxDays || ''}
                  onChange={(e) => handleParameterChange('expirationMaxDays', parseInt(e.target.value))}
                  helperText="Maximum days until expiration"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Moneyness</InputLabel>
                  <Select
                    value={params.moneyness || 'any'}
                    onChange={(e) => handleParameterChange('moneyness', e.target.value)}
                  >
                    <MenuItem value="any">Any</MenuItem>
                    <MenuItem value="ITM">In The Money (ITM)</MenuItem>
                    <MenuItem value="ATM">At The Money (ATM)</MenuItem>
                    <MenuItem value="OTM">Out of The Money (OTM)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Greeks Filters */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Greeks Filters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Delta"
                  type="number"
                  value={params.deltaMin || ''}
                  onChange={(e) => handleParameterChange('deltaMin', parseFloat(e.target.value))}
                  inputProps={{ min: -1, max: 1, step: 0.01 }}
                  helperText="Price sensitivity (-1 to 1)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Delta"
                  type="number"
                  value={params.deltaMax || ''}
                  onChange={(e) => handleParameterChange('deltaMax', parseFloat(e.target.value))}
                  inputProps={{ min: -1, max: 1, step: 0.01 }}
                  helperText="Maximum delta"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Gamma"
                  type="number"
                  value={params.gammaMin || ''}
                  onChange={(e) => handleParameterChange('gammaMin', parseFloat(e.target.value))}
                  inputProps={{ step: 0.001 }}
                  helperText="Delta acceleration"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Theta"
                  type="number"
                  value={params.thetaMin || ''}
                  onChange={(e) => handleParameterChange('thetaMin', parseFloat(e.target.value))}
                  helperText="Time decay (usually negative)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Vega"
                  type="number"
                  value={params.vegaMin || ''}
                  onChange={(e) => handleParameterChange('vegaMin', parseFloat(e.target.value))}
                  helperText="Volatility sensitivity"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Pricing & Volume */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">Pricing & Volume</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Bid"
                  type="number"
                  value={params.bidMin || ''}
                  onChange={(e) => handleParameterChange('bidMin', parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  helperText="Minimum bid price"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Max Bid-Ask Spread"
                  type="number"
                  value={params.bidAskSpreadMax || ''}
                  onChange={(e) => handleParameterChange('bidAskSpreadMax', parseFloat(e.target.value))}
                  InputProps={{
                    startAdornment: '$',
                  }}
                  helperText="Maximum spread (lower = better liquidity)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Open Interest"
                  type="number"
                  value={params.openInterestMin || ''}
                  onChange={(e) => handleParameterChange('openInterestMin', parseInt(e.target.value))}
                  helperText="Minimum open interest (liquidity indicator)"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Min Volume"
                  type="number"
                  value={params.volumeMin || ''}
                  onChange={(e) => handleParameterChange('volumeMin', parseInt(e.target.value))}
                  helperText="Minimum daily volume"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </>
    );
  };

  const renderProfileDialog = () => (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingProfile ? 'Edit Screening Profile' : 'Create New Screening Profile'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Basic Info */}
          <TextField
            fullWidth
            label="Profile Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 3 }}
            required
            helperText="Give your screening profile a descriptive name"
          />

          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Asset Type</InputLabel>
            <Select
              value={formData.asset_type}
              onChange={(e) => handleAssetTypeChange(e.target.value as AssetType)}
            >
              <MenuItem value="stock">Stock</MenuItem>
              <MenuItem value="call_option">Call Option</MenuItem>
              <MenuItem value="put_option">Put Option</MenuItem>
            </Select>
          </FormControl>

          {/* Parameters Section */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
            Screening Parameters
          </Typography>
          {formData.asset_type === 'stock' ? renderStockParameters() : renderOptionsParameters()}

          {/* Schedule Settings */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Schedule Settings
          </Typography>
          <Paper sx={{ p: 2, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.schedule_enabled}
                  onChange={(e) =>
                    setFormData({ ...formData, schedule_enabled: e.target.checked })
                  }
                />
              }
              label="Enable Scheduled Scanning"
            />
            {formData.schedule_enabled && (
              <>
                <Box sx={{ mt: 2 }}>
                  <Typography gutterBottom>
                    Scan Interval: {formData.schedule_interval} minutes
                  </Typography>
                  <Slider
                    value={formData.schedule_interval}
                    onChange={(_, value) =>
                      setFormData({ ...formData, schedule_interval: value as number })
                    }
                    min={5}
                    max={240}
                    step={5}
                    marks={[
                      { value: 5, label: '5m' },
                      { value: 15, label: '15m' },
                      { value: 60, label: '1h' },
                      { value: 240, label: '4h' },
                    ]}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.schedule_market_hours_only}
                      onChange={(e) =>
                        setFormData({ ...formData, schedule_market_hours_only: e.target.checked })
                      }
                    />
                  }
                  label="Run only during market hours"
                />
              </>
            )}
          </Paper>

          {/* Execution Settings */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
            Execution Settings
          </Typography>
          <Paper sx={{ p: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.auto_execute}
                  onChange={(e) => setFormData({ ...formData, auto_execute: e.target.checked })}
                />
              }
              label={
                <Box>
                  Auto-execute trades for matches
                  <Tooltip title="⚠️ WARNING: This will automatically place orders when matches are found">
                    <IconButton size="small">
                      <HelpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
            {formData.auto_execute && (
              <TextField
                fullWidth
                label="Max Transaction Amount"
                type="number"
                value={formData.max_transaction_amount}
                onChange={(e) =>
                  setFormData({ ...formData, max_transaction_amount: parseFloat(e.target.value) })
                }
                InputProps={{
                  startAdornment: '$',
                }}
                sx={{ mt: 2 }}
                helperText="Maximum amount per trade"
              />
            )}
          </Paper>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
        >
          {editingProfile ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Screener Builder</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateNew}>
          New Profile
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

      {/* Profiles List */}
      <Paper>
        {profiles.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              No screening profiles yet
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Create your first profile to start screening for stocks or options
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
              sx={{ mt: 2 }}
            >
              Create First Profile
            </Button>
          </Box>
        ) : (
          <List>
            {profiles.map((profile) => (
              <ListItem key={profile.id} divider>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {profile.name}
                      <Chip
                        label={profile.asset_type.replace('_', ' ')}
                        size="small"
                        color={profile.asset_type === 'stock' ? 'primary' : 'secondary'}
                      />
                      {profile.schedule_enabled && (
                        <Chip label={`Every ${profile.schedule_interval}m`} size="small" />
                      )}
                      {profile.auto_execute && (
                        <Chip label="Auto-Execute" size="small" color="warning" />
                      )}
                    </Box>
                  }
                  secondary={`Created ${new Date(profile.created_at!).toLocaleDateString()}`}
                />
                <ListItemSecondaryAction>
                  <Tooltip title="Test Scan">
                    <IconButton
                      edge="end"
                      onClick={() => handleTestScan(profile.id!)}
                      disabled={loading}
                    >
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton edge="end" onClick={() => handleEdit(profile)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton edge="end" onClick={() => handleDelete(profile.id!)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {renderProfileDialog()}

      {/* Test Results Dialog */}
      <Dialog
        open={testResultsOpen}
        onClose={() => setTestResultsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Scan Results</DialogTitle>
        <DialogContent>
          {testResults && testResults.length > 0 ? (
            <Box>
              <Typography variant="body1" gutterBottom>
                Found {testResults.length} match(es):
              </Typography>
              <List>
                {testResults.map((result: any, index: number) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={result.symbol}
                      secondary={`Price: $${result.price} | Volume: ${result.volume}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : (
            <Typography variant="body1" color="textSecondary">
              No matches found
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestResultsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ScreenerBuilder;
