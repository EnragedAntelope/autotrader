import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  FormHelperText,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  InputAdornment,
  Menu,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Save as SaveIcon,
  GetApp as ImportIcon,
  LibraryAdd as TemplateIcon,
  Info as InfoIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import HelpTooltip from './HelpTooltip';
import {
  STOCK_PARAMETERS,
  OPTION_PARAMETERS,
  DEFAULT_PROFILES,
  ParameterDefinition,
} from '../constants/parameterDefinitions';
import { AssetType, ScreeningProfile, Watchlist } from '../types';

interface ProfileFormData {
  name: string;
  asset_type: AssetType;
  parameters: Record<string, any>;
  watchlist_id?: number;
  schedule_enabled: boolean;
  schedule_interval: number;
  schedule_market_hours_only: boolean;
  auto_execute: boolean;
  max_transaction_amount: number;
}

function ScreenerBuilder() {
  const [profiles, setProfiles] = useState<ScreeningProfile[]>([]);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [editingProfile, setEditingProfile] = useState<ScreeningProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);
  const [testResultsOpen, setTestResultsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [apiEstimateDialogOpen, setApiEstimateDialogOpen] = useState(false);
  const [pendingTestProfileId, setPendingTestProfileId] = useState<number | null>(null);
  const [apiEstimate, setApiEstimate] = useState<{ alpaca: number; alphaVantage: number } | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    asset_type: 'stock',
    parameters: {},
    watchlist_id: undefined,
    schedule_enabled: false,
    schedule_interval: 15,
    schedule_market_hours_only: true,
    auto_execute: false,
    max_transaction_amount: 1000,
  });

  useEffect(() => {
    loadProfiles();
    loadWatchlists();
  }, []);

  const loadProfiles = async () => {
    try {
      const profileList = await window.electron.getProfiles();
      setProfiles(profileList);
    } catch (err: any) {
      setError(`Failed to load profiles: ${err.message}`);
    }
  };

  const loadWatchlists = async () => {
    try {
      const watchlistData = await window.electron.getWatchlists();
      setWatchlists(watchlistData);
    } catch (err: any) {
      console.error('Error loading watchlists:', err);
    }
  };

  const getParametersByAssetType = () => {
    return formData.asset_type === 'stock' ? STOCK_PARAMETERS : OPTION_PARAMETERS;
  };

  const getCategorizedParameters = () => {
    const params = getParametersByAssetType();
    const categories: Record<string, ParameterDefinition[]> = {};

    Object.values(params).forEach((param) => {
      if (!categories[param.category]) {
        categories[param.category] = [];
      }
      categories[param.category].push(param);
    });

    return categories;
  };

  const validateParameter = (param: ParameterDefinition, value: any): string | null => {
    if (value === undefined || value === null || value === '') {
      return null; // Optional field
    }

    if (param.type === 'number') {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        return 'Must be a valid number';
      }
      if (param.min !== undefined && numValue < param.min) {
        return `Must be at least ${param.min}`;
      }
      if (param.max !== undefined && numValue > param.max) {
        return `Must be at most ${param.max}`;
      }
    }

    return null;
  };

  const validateAllParameters = (): boolean => {
    const params = getParametersByAssetType();
    const errors: Record<string, string> = {};

    Object.entries(formData.parameters).forEach(([key, value]) => {
      const param = params[key];
      if (param) {
        const error = validateParameter(param, value);
        if (error) {
          errors[key] = error;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleParameterChange = (paramName: string, value: any) => {
    const params = getParametersByAssetType();
    const param = params[paramName];

    // Clear validation error for this field
    const newErrors = { ...validationErrors };
    delete newErrors[paramName];
    setValidationErrors(newErrors);

    // Validate and update
    if (param && param.type === 'number') {
      const numValue = value === '' ? undefined : parseFloat(value);
      if (numValue !== undefined && !isNaN(numValue)) {
        setFormData({
          ...formData,
          parameters: {
            ...formData.parameters,
            [paramName]: numValue,
          },
        });
      } else if (value === '') {
        // Remove parameter if cleared
        const newParams = { ...formData.parameters };
        delete newParams[paramName];
        setFormData({
          ...formData,
          parameters: newParams,
        });
      }
    } else {
      setFormData({
        ...formData,
        parameters: {
          ...formData.parameters,
          [paramName]: value,
        },
      });
    }
  };

  const handleOpenDialog = (profile?: ScreeningProfile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        name: profile.name,
        asset_type: profile.asset_type,
        parameters: profile.parameters,
        watchlist_id: profile.watchlist_id,
        schedule_enabled: Boolean(profile.schedule_enabled),
        schedule_interval: profile.schedule_interval || 15,
        schedule_market_hours_only: Boolean(profile.schedule_market_hours_only),
        auto_execute: Boolean(profile.auto_execute),
        max_transaction_amount: profile.max_transaction_amount || 1000,
      });
    } else {
      setEditingProfile(null);
      setFormData({
        name: '',
        asset_type: 'stock',
        parameters: {},
        watchlist_id: undefined,
        schedule_enabled: false,
        schedule_interval: 15,
        schedule_market_hours_only: true,
        auto_execute: false,
        max_transaction_amount: 1000,
      });
    }
    setValidationErrors({});
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingProfile(null);
    setValidationErrors({});
  };

  const handleLoadTemplate = (templateKey: keyof typeof DEFAULT_PROFILES) => {
    const template = DEFAULT_PROFILES[templateKey];
    setEditingProfile(null); // Clear any existing profile being edited
    setFormData({
      name: template.name,
      asset_type: template.asset_type as AssetType,
      parameters: template.parameters,
      schedule_enabled: false,
      schedule_interval: 15,
      schedule_market_hours_only: true,
      auto_execute: false,
      max_transaction_amount: 1000,
    });
    setTemplateMenuAnchor(null);
    setDialogOpen(true); // Open the dialog to show the template
    setSuccess(`Loaded template: ${template.name}`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Profile name is required');
      return;
    }

    if (!validateAllParameters()) {
      setError('Please fix validation errors before saving');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (editingProfile) {
        await window.electron.updateProfile(editingProfile.id, formData);
        setSuccess('Profile updated successfully!');
      } else {
        await window.electron.createProfile(formData);
        setSuccess('Profile created successfully!');
      }

      handleCloseDialog();
      loadProfiles();
    } catch (err: any) {
      setError(`Failed to save profile: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this profile?')) {
      return;
    }

    try {
      await window.electron.deleteProfile(id);
      setSuccess('Profile deleted successfully!');
      loadProfiles();
    } catch (err: any) {
      setError(`Failed to delete profile: ${err.message}`);
    }
  };

  const estimateApiCalls = async (profileId: number) => {
    try {
      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) return { alpaca: 0, alphaVantage: 0 };

      // Find the watchlist to count symbols
      const watchlist = watchlists.find((w) => w.id === profile.watchlist_id);
      let symbolCount = 0;

      if (watchlist) {
        // Check if this is the special ALL_STOCKS watchlist
        if (watchlist.name.includes('ALL US STOCKS') || watchlist.name.includes('Universe Scanner')) {
          symbolCount = 10000; // Approximate count for all US stocks
        } else {
          // Get actual symbol count from watchlist
          const symbols = await window.electron.getWatchlistSymbols(watchlist.id);
          symbolCount = symbols.length;
        }
      } else {
        // Default watchlist
        symbolCount = 60; // "All Major Stocks" default
      }

      // Alpaca calls: ~2 per symbol (quote + bar data)
      const alpacaCalls = symbolCount * 2;

      // Alpha Vantage calls depend on parameters used
      let alphaVantageCalls = 0;
      const params = profile.parameters || {};

      // Check if any basic fundamental parameters are used (OVERVIEW endpoint)
      const basicFundamentalParams = [
        'minMarketCap', 'maxMarketCap', 'minPERatio', 'maxPERatio',
        'minPBRatio', 'maxPBRatio', 'minDividendYield', 'maxDividendYield',
        'minBeta', 'maxBeta', 'sector', 'country'
      ];

      const usesBasicFundamentals = basicFundamentalParams.some(param =>
        params[param] !== undefined && params[param] !== null && params[param] !== ''
      );

      if (usesBasicFundamentals) {
        alphaVantageCalls += symbolCount; // 1 OVERVIEW call per symbol
      }

      // Check if any advanced fundamental parameters are used (INCOME_STATEMENT + BALANCE_SHEET)
      const advancedFundamentalParams = [
        'minROE', 'minROA', 'minCurrentRatio', 'maxCurrentRatio',
        'minQuickRatio', 'maxDebtToEquity'
      ];

      const usesAdvancedFundamentals = advancedFundamentalParams.some(param =>
        params[param] !== undefined && params[param] !== null && params[param] !== ''
      );

      if (usesAdvancedFundamentals) {
        alphaVantageCalls += symbolCount * 2; // 2 additional calls per symbol (INCOME_STATEMENT + BALANCE_SHEET)
      }

      return { alpaca: alpacaCalls, alphaVantage: alphaVantageCalls };
    } catch (err) {
      console.error('Error estimating API calls:', err);
      return { alpaca: 0, alphaVantage: 0 };
    }
  };

  const handleTestClick = async (profileId: number) => {
    // Estimate API calls and show confirmation dialog
    const estimate = await estimateApiCalls(profileId);
    setApiEstimate(estimate);
    setPendingTestProfileId(profileId);
    setApiEstimateDialogOpen(true);
  };

  const handleConfirmTest = () => {
    if (pendingTestProfileId !== null) {
      setApiEstimateDialogOpen(false);
      handleTest(pendingTestProfileId);
    }
  };

  const handleCancelTest = () => {
    setApiEstimateDialogOpen(false);
    setPendingTestProfileId(null);
    setApiEstimate(null);
  };

  const handleTest = async (profileId: number) => {
    setLoading(true);
    setError(null);

    try {
      const results = await window.electron.runScan(profileId);

      // Attach profile info to results for display
      const profile = profiles.find((p) => p.id === profileId);
      const enhancedResults = {
        ...results,
        profile: profile,
      };

      setTestResults(enhancedResults);
      setTestResultsOpen(true);
      setSuccess(`Scan completed! Found ${results.matches.length} matches`);
    } catch (err: any) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatParameterValue = (paramName: string, value: any) => {
    if (value === null || value === undefined) return 'N/A';

    // Market cap formatting
    if (paramName.toLowerCase().includes('marketcap')) {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toFixed(0)}`;
    }

    // Percentage formatting
    if (paramName.toLowerCase().includes('percent') || paramName.toLowerCase().includes('yield') ||
        paramName.toLowerCase().includes('change') || paramName === 'roe' || paramName === 'roa') {
      return `${value.toFixed(2)}%`;
    }

    // Ratio formatting
    if (paramName.toLowerCase().includes('ratio') || paramName === 'pe' || paramName === 'pb' ||
        paramName === 'beta' || paramName.toLowerCase().includes('debt')) {
      return value.toFixed(2);
    }

    // Price formatting
    if (paramName.toLowerCase().includes('price')) {
      return `$${value.toFixed(2)}`;
    }

    // Volume formatting
    if (paramName.toLowerCase().includes('volume')) {
      return value.toLocaleString();
    }

    // Default number formatting
    if (typeof value === 'number') {
      return value.toFixed(2);
    }

    return String(value);
  };

  const getParameterLabel = (paramName: string): string => {
    const params = formData.asset_type === 'stock' ? STOCK_PARAMETERS : OPTION_PARAMETERS;
    return params[paramName]?.label || paramName;
  };

  const renderParameterInput = (param: ParameterDefinition) => {
    const value = formData.parameters[param.name] ?? '';
    const error = validationErrors[param.name];

    if (param.type === 'select') {
      return (
        <Grid item xs={12} sm={6} md={4} key={param.name}>
          <FormControl fullWidth error={!!error} size="small">
            <InputLabel>{param.label}</InputLabel>
            <Select
              value={value}
              label={param.label}
              onChange={(e) => handleParameterChange(param.name, e.target.value)}
            >
              {param.options?.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" color="textSecondary">
              {param.suggestedValue && `Suggested: ${param.suggestedValue}`}
            </Typography>
            <HelpTooltip title={param.helpText} />
          </Box>
        </Grid>
      );
    }

    return (
      <Grid item xs={12} sm={6} md={4} key={param.name}>
        <TextField
          fullWidth
          size="small"
          label={param.label}
          type="number"
          value={value}
          onChange={(e) => handleParameterChange(param.name, e.target.value)}
          error={!!error}
          helperText={error || (param.suggestedValue && `Suggested: ${param.suggestedValue}`)}
          InputProps={{
            startAdornment: param.unit === '$' && <InputAdornment position="start">$</InputAdornment>,
            endAdornment: param.unit && param.unit !== '$' && (
              <InputAdornment position="end">{param.unit}</InputAdornment>
            ),
          }}
          inputProps={{
            min: param.min,
            max: param.max,
            step: param.step || 'any',
          }}
        />
        <HelpTooltip title={param.helpText} />
      </Grid>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      basic: 'Basic Filters',
      technical: 'Technical Indicators',
      fundamental: 'Fundamental Ratios',
      options: 'Option Parameters',
      filters: 'Geographic & Sector',
    };
    return labels[category] || category;
  };

  const getCategoryDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      basic: 'Price, volume, and market cap filters',
      technical: 'RSI, beta, momentum, and chart-based metrics',
      fundamental: 'Financial health, profitability, and valuation ratios',
      options: 'Strike, expiration, Greeks, and option-specific filters',
      filters: 'Country, sector, and industry filters',
    };
    return descriptions[category] || '';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Screening Profiles</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<TemplateIcon />}
            onClick={(e) => setTemplateMenuAnchor(e.currentTarget)}
          >
            Load Template
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            New Profile
          </Button>
        </Box>
      </Box>

      {/* Template Menu */}
      <Menu
        anchorEl={templateMenuAnchor}
        open={Boolean(templateMenuAnchor)}
        onClose={() => setTemplateMenuAnchor(null)}
      >
        <MenuItem disabled>
          <Typography variant="caption" color="textSecondary">
            STOCK TEMPLATES
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('valueStocks')}>
          <ListItemText
            primary="Value Stocks (Conservative)"
            secondary="Financial health & undervaluation"
          />
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('growthStocks')}>
          <ListItemText primary="Growth Stocks" secondary="High-growth mid-caps" />
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('dividendStocks')}>
          <ListItemText primary="Dividend Income" secondary="Stable dividend payers" />
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('momentumStocks')}>
          <ListItemText primary="Momentum Stocks" secondary="Strong price momentum" />
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('fastScan')}>
          <ListItemText
            primary="Fast Scan (Price & Volume)"
            secondary="⚡ No rate limits - completes in seconds"
          />
        </MenuItem>
        <Divider />
        <MenuItem disabled>
          <Typography variant="caption" color="textSecondary">
            OPTION TEMPLATES
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('highDeltaCalls')}>
          <ListItemText primary="High Delta Calls" secondary="ITM calls, 0.7-0.9 delta" />
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('atmCalls')}>
          <ListItemText primary="At-The-Money Calls" secondary="Balanced risk/reward" />
        </MenuItem>
        <MenuItem onClick={() => handleLoadTemplate('protectivePuts')}>
          <ListItemText primary="Protective Puts" secondary="OTM puts for protection" />
        </MenuItem>
      </Menu>

      {/* Alerts */}
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

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <InfoIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Screening Profiles Yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Create a new profile or load a template to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<TemplateIcon />}
            onClick={(e) => setTemplateMenuAnchor(e.currentTarget)}
          >
            Browse Templates
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {profiles.map((profile) => (
            <Grid item xs={12} md={6} lg={4} key={profile.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="h6">{profile.name}</Typography>
                    <Chip
                      label={profile.asset_type.toUpperCase()}
                      size="small"
                      color={profile.asset_type === 'stock' ? 'primary' : 'secondary'}
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {Object.keys(profile.parameters).length} parameters configured
                  </Typography>
                  {profile.schedule_enabled && (
                    <Chip
                      label={`Scheduled: Every ${profile.schedule_interval}m`}
                      size="small"
                      color="success"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<PlayIcon />} onClick={() => handleTestClick(profile.id)}>
                    Run
                  </Button>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenDialog(profile)}>
                    Edit
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(profile.id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          {editingProfile ? 'Edit Profile' : 'Create New Profile'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {/* Basic Information */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Profile Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  helperText="Give your profile a descriptive name"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Asset Type</InputLabel>
                  <Select
                    value={formData.asset_type}
                    label="Asset Type"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        asset_type: e.target.value as AssetType,
                        parameters: {},
                      })
                    }
                  >
                    <MenuItem value="stock">Stock</MenuItem>
                    <MenuItem value="option">Option</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Watchlist</InputLabel>
                  <Select
                    value={formData.watchlist_id || ''}
                    label="Watchlist"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        watchlist_id: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  >
                    <MenuItem value="">
                      <em>Use Default Watchlist</em>
                    </MenuItem>
                    {watchlists.map((watchlist) => (
                      <MenuItem key={watchlist.id} value={watchlist.id}>
                        {watchlist.name} {watchlist.is_default === 1 && '(Default)'}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>Choose which stocks to scan (optional - defaults to "All Major Stocks")</FormHelperText>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Screening Parameters by Category */}
            <Typography variant="h6" gutterBottom>
              Screening Parameters
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Configure filters for your scan. Hover over <HelpIcon fontSize="small" /> icons for detailed
              explanations and suggested values.
            </Typography>

            {Object.entries(getCategorizedParameters()).map(([category, params]) => (
              <Accordion key={category} defaultExpanded={category === 'basic'}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box>
                    <Typography variant="subtitle1">{getCategoryLabel(category)}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {getCategoryDescription(category)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    {params.map((param) => renderParameterInput(param))}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            ))}

            <Divider sx={{ my: 3 }} />

            {/* Automation Settings */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Automation & Scheduling</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.schedule_enabled}
                          onChange={(e) =>
                            setFormData({ ...formData, schedule_enabled: e.target.checked })
                          }
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">Enable Scheduled Scanning</Typography>
                          <Typography variant="caption" color="textSecondary">
                            Automatically run this scan at regular intervals
                          </Typography>
                        </Box>
                      }
                    />
                  </Grid>
                  {formData.schedule_enabled && (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Scan Interval (minutes)"
                          type="number"
                          value={formData.schedule_interval}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              schedule_interval: parseInt(e.target.value) || 15,
                            })
                          }
                          inputProps={{ min: 1, max: 1440 }}
                          helperText="How often to run the scan (1-1440 minutes)"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.schedule_market_hours_only}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  schedule_market_hours_only: e.target.checked,
                                })
                              }
                            />
                          }
                          label="Market Hours Only"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.auto_execute}
                              onChange={(e) =>
                                setFormData({ ...formData, auto_execute: e.target.checked })
                              }
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2" color="error" fontWeight="bold">
                                ⚠️ Auto-Execute Trades (REAL MONEY AT RISK!)
                              </Typography>
                              <Typography variant="caption" color="error">
                                WARNING: This will automatically place REAL orders when stocks match your criteria.
                                Only enable after thorough testing in paper trading mode!
                              </Typography>
                            </Box>
                          }
                        />
                      </Grid>
                      {formData.auto_execute && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Max Transaction Amount"
                            type="number"
                            value={formData.max_transaction_amount}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                max_transaction_amount: parseFloat(e.target.value) || 1000,
                              })
                            }
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            inputProps={{ min: 1, max: 100000 }}
                            helperText="Maximum amount per trade"
                          />
                        </Grid>
                      )}
                    </>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary" startIcon={<SaveIcon />}>
            {editingProfile ? 'Update Profile' : 'Create Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* API Call Estimate Dialog */}
      <Dialog
        open={apiEstimateDialogOpen}
        onClose={handleCancelTest}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>API Call Estimate</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Running this scan will use approximately:
          </Typography>

          {apiEstimate && (
            <Box sx={{ mt: 2, mb: 2 }}>
              <Paper sx={{ p: 2, mb: 2, bgcolor: 'primary.light' }}>
                <Typography variant="h6" color="primary.contrastText">
                  Alpaca API: ~{apiEstimate.alpaca.toLocaleString()} calls
                </Typography>
                <Typography variant="caption" color="primary.contrastText">
                  For quotes, bars, and asset data
                </Typography>
              </Paper>

              <Paper sx={{ p: 2, bgcolor: apiEstimate.alphaVantage > 0 ? 'warning.light' : 'success.light' }}>
                <Typography variant="h6" color={apiEstimate.alphaVantage > 0 ? 'warning.contrastText' : 'success.contrastText'}>
                  Alpha Vantage API: ~{apiEstimate.alphaVantage.toLocaleString()} calls
                </Typography>
                <Typography variant="caption" color={apiEstimate.alphaVantage > 0 ? 'warning.contrastText' : 'success.contrastText'}>
                  {apiEstimate.alphaVantage > 0
                    ? 'For fundamental data (P/E, ROE, etc.)'
                    : 'No fundamental parameters selected'}
                </Typography>
              </Paper>
            </Box>
          )}

          {apiEstimate && apiEstimate.alphaVantage > 25 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Note:</strong> This scan will exceed the free tier Alpha Vantage limit (25 calls/day).
                Make sure you have a Premium API key, or the scan may fail partway through.
              </Typography>
            </Alert>
          )}

          {apiEstimate && apiEstimate.alpaca > 200 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Tip:</strong> This scan will use {apiEstimate.alpaca} Alpaca calls.
                Free tier limit is 200/minute. Consider using a paid plan for large scans.
              </Typography>
            </Alert>
          )}

          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            These are estimates. Actual usage may vary based on caching and market conditions.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelTest}>Cancel</Button>
          <Button onClick={handleConfirmTest} variant="contained" color="primary">
            Proceed with Scan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog
        open={testResultsOpen}
        onClose={() => setTestResultsOpen(false)}
        maxWidth="lg"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle>Scan Results</DialogTitle>
        <DialogContent>
          {testResults && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Found {testResults.matches.length} matches in {testResults.duration}ms
              </Alert>

              {testResults.profile && Object.keys(testResults.profile.parameters || {}).length > 0 && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.light' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Screened Parameters:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {Object.entries(testResults.profile.parameters).map(([key, value]: [string, any]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        return (
                          <Chip
                            key={key}
                            label={`${getParameterLabel(key)}: ${value}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        );
                      }
                      return null;
                    })}
                  </Box>
                </Paper>
              )}

              {testResults.matches.length === 0 ? (
                <Alert severity="info">
                  No stocks matched your criteria. Try adjusting your parameters.
                </Alert>
              ) : (
                <>
                  {testResults.matches.slice(0, 20).map((match: any, index: number) => (
                    <Paper key={index} sx={{ p: 2, mb: 2 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {match.symbol}
                      </Typography>

                      <Divider sx={{ mb: 1 }} />

                      <Grid container spacing={2}>
                        {/* Basic Market Data */}
                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="textSecondary">
                            Price
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {formatParameterValue('price', match.data?.price)}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="textSecondary">
                            Volume
                          </Typography>
                          <Typography variant="body1">
                            {formatParameterValue('volume', match.data?.volume)}
                          </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <Typography variant="caption" color="textSecondary">
                            Day Change
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{
                              color: (match.data?.dayChangePercent || 0) >= 0 ? 'success.main' : 'error.main',
                              fontWeight: 'bold',
                            }}
                          >
                            {formatParameterValue('dayChangePercent', match.data?.dayChangePercent)}
                          </Typography>
                        </Grid>

                        {/* Show matched parameters if available */}
                        {match.data?.marketCap && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Market Cap
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('marketCap', match.data.marketCap)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.pe && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              P/E Ratio
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('pe', match.data.pe)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.pb && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              P/B Ratio
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('pb', match.data.pb)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.dividendYield !== undefined && match.data?.dividendYield !== null && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Dividend Yield
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('dividendYield', match.data.dividendYield)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.beta && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Beta
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('beta', match.data.beta)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.roe && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              ROE
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('roe', match.data.roe)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.roa && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              ROA
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('roa', match.data.roa)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.currentRatio && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Current Ratio
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('currentRatio', match.data.currentRatio)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.quickRatio && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Quick Ratio
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('quickRatio', match.data.quickRatio)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.debtToEquity !== undefined && match.data?.debtToEquity !== null && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Debt to Equity
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('debtToEquity', match.data.debtToEquity)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.sector && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              Sector
                            </Typography>
                            <Typography variant="body1">{match.data.sector}</Typography>
                          </Grid>
                        )}

                        {match.data?.sma20 && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              SMA 20
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('price', match.data.sma20)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.sma50 && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              SMA 50
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('price', match.data.sma50)}
                            </Typography>
                          </Grid>
                        )}

                        {match.data?.rsi && (
                          <Grid item xs={12} sm={6} md={3}>
                            <Typography variant="caption" color="textSecondary">
                              RSI
                            </Typography>
                            <Typography variant="body1">
                              {formatParameterValue('rsi', match.data.rsi)}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </Paper>
                  ))}

                  {testResults.matches.length > 20 && (
                    <Alert severity="info">
                      Showing first 20 of {testResults.matches.length} matches. Check the Scan Results page
                      for the complete list.
                    </Alert>
                  )}
                </>
              )}
            </Box>
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
