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
import { AssetType, ScreeningProfile } from '../types';

interface ProfileFormData {
  name: string;
  asset_type: AssetType;
  parameters: Record<string, any>;
  schedule_enabled: boolean;
  schedule_interval: number;
  schedule_market_hours_only: boolean;
  auto_execute: boolean;
  max_transaction_amount: number;
}

function ScreenerBuilder() {
  const [profiles, setProfiles] = useState<ScreeningProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<ScreeningProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState<null | HTMLElement>(null);
  const [testResultsOpen, setTestResultsOpen] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    asset_type: 'stock',
    parameters: {},
    schedule_enabled: false,
    schedule_interval: 15,
    schedule_market_hours_only: true,
    auto_execute: false,
    max_transaction_amount: 1000,
  });

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

  const handleTest = async (profileId: number) => {
    setLoading(true);
    setError(null);

    try {
      const results = await window.electron.runScan(profileId);
      setTestResults(results);
      setTestResultsOpen(true);
      setSuccess(`Scan completed! Found ${results.matches.length} matches`);
    } catch (err: any) {
      setError(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
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
                  <Button size="small" startIcon={<PlayIcon />} onClick={() => handleTest(profile.id)}>
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
                              <Typography variant="body2" color="error">
                                Auto-Execute Trades (Use with caution!)
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                Automatically place orders for matches
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

      {/* Test Results Dialog */}
      <Dialog
        open={testResultsOpen}
        onClose={() => setTestResultsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Scan Results</DialogTitle>
        <DialogContent>
          {testResults && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Found {testResults.matches.length} matches in {testResults.duration}ms
              </Alert>
              <List>
                {testResults.matches.slice(0, 10).map((match: any, index: number) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={match.symbol}
                      secondary={`Price: $${match.data?.price?.toFixed(2) || 'N/A'} | Volume: ${
                        match.data?.volume?.toLocaleString() || 'N/A'
                      }`}
                    />
                  </ListItem>
                ))}
              </List>
              {testResults.matches.length > 10 && (
                <Typography variant="caption" color="textSecondary">
                  ... and {testResults.matches.length - 10} more
                </Typography>
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
