import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Divider,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Shield as ShieldIcon,
} from '@mui/icons-material';

interface RiskSettings {
  max_transaction_amount: number;
  daily_spend_limit: number;
  weekly_spend_limit: number;
  max_positions: number;
  enabled: boolean;
  stop_loss_default: number;
  take_profit_default: number;
  allow_duplicate_positions: boolean;
}

function RiskManagement() {
  const [settings, setSettings] = useState<RiskSettings>({
    max_transaction_amount: 1000,
    daily_spend_limit: 5000,
    weekly_spend_limit: 20000,
    max_positions: 10,
    enabled: true,
    stop_loss_default: 5.0,
    take_profit_default: 10.0,
    allow_duplicate_positions: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electron.getRiskSettings();

      // Convert SQLite integers to booleans
      setSettings({
        ...result,
        enabled: Boolean(result.enabled),
        allow_duplicate_positions: Boolean(result.allow_duplicate_positions),
      });
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error loading risk settings:', err);
      setError(err.message || 'Failed to load risk settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field: keyof RiskSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Validate settings
      if (settings.max_transaction_amount <= 0) {
        throw new Error('Max transaction amount must be greater than 0');
      }
      if (settings.daily_spend_limit <= 0) {
        throw new Error('Daily spend limit must be greater than 0');
      }
      if (settings.weekly_spend_limit <= 0) {
        throw new Error('Weekly spend limit must be greater than 0');
      }
      if (settings.max_positions <= 0) {
        throw new Error('Max positions must be greater than 0');
      }
      if (settings.stop_loss_default < 0 || settings.stop_loss_default > 100) {
        throw new Error('Stop loss must be between 0 and 100');
      }
      if (settings.take_profit_default < 0 || settings.take_profit_default > 1000) {
        throw new Error('Take profit must be between 0 and 1000');
      }

      // Warn if limits are too high
      if (settings.daily_spend_limit > 50000) {
        if (
          !window.confirm(
            'Your daily spend limit is very high ($50,000+). Are you sure you want to proceed?'
          )
        ) {
          setSaving(false);
          return;
        }
      }

      await window.electron.updateRiskSettings(settings);
      setSuccessMessage('Risk settings saved successfully!');
      setHasChanges(false);
    } catch (err: any) {
      console.error('Error saving risk settings:', err);
      setError(err.message || 'Failed to save risk settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadSettings();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ShieldIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h4">Risk Management</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            disabled={!hasChanges || saving}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Risk Protection Status */}
      <Alert
        severity={settings.enabled ? 'success' : 'warning'}
        icon={settings.enabled ? <ShieldIcon /> : <WarningIcon />}
        sx={{ mb: 3 }}
      >
        {settings.enabled
          ? 'Risk protection is ENABLED. All trades will be checked against your limits.'
          : 'Risk protection is DISABLED. Trades will NOT be checked against limits. Use with extreme caution!'}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Global Risk Controls */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Global Risk Controls
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                These limits apply to all trading activity
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enabled}
                        onChange={(e) => handleChange('enabled', e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">Enable Risk Protection</Typography>
                        <Typography variant="caption" color="textSecondary">
                          When enabled, all trades are checked against configured limits
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Transaction Amount"
                    type="number"
                    value={settings.max_transaction_amount}
                    onChange={(e) =>
                      handleChange('max_transaction_amount', parseFloat(e.target.value) || 0)
                    }
                    helperText="Maximum amount for a single trade ($)"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                    disabled={!settings.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Open Positions"
                    type="number"
                    value={settings.max_positions}
                    onChange={(e) => handleChange('max_positions', parseInt(e.target.value) || 0)}
                    helperText="Maximum number of open positions at any time"
                    disabled={!settings.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Daily Spend Limit"
                    type="number"
                    value={settings.daily_spend_limit}
                    onChange={(e) =>
                      handleChange('daily_spend_limit', parseFloat(e.target.value) || 0)
                    }
                    helperText="Maximum total spending per day ($)"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                    disabled={!settings.enabled}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Weekly Spend Limit"
                    type="number"
                    value={settings.weekly_spend_limit}
                    onChange={(e) =>
                      handleChange('weekly_spend_limit', parseFloat(e.target.value) || 0)
                    }
                    helperText="Maximum total spending per week ($)"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                    }}
                    disabled={!settings.enabled}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Position Management Defaults */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Position Management Defaults
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Default stop-loss and take-profit levels for new positions
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Stop Loss"
                    type="number"
                    value={settings.stop_loss_default}
                    onChange={(e) =>
                      handleChange('stop_loss_default', parseFloat(e.target.value) || 0)
                    }
                    helperText="Default stop loss percentage (e.g., 5 = 5% loss)"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>,
                    }}
                    inputProps={{
                      step: 0.5,
                      min: 0,
                      max: 100,
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Default Take Profit"
                    type="number"
                    value={settings.take_profit_default}
                    onChange={(e) =>
                      handleChange('take_profit_default', parseFloat(e.target.value) || 0)
                    }
                    helperText="Default take profit percentage (e.g., 10 = 10% gain)"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>,
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
                    These percentages are applied automatically to new positions. You can override
                    them for individual positions in the Active Positions view.
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Settings */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advanced Settings
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Additional risk management options
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.allow_duplicate_positions}
                    onChange={(e) => handleChange('allow_duplicate_positions', e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1">Allow Duplicate Positions</Typography>
                    <Typography variant="caption" color="textSecondary">
                      When enabled, allows opening multiple positions in the same symbol
                    </Typography>
                  </Box>
                }
                disabled={!settings.enabled}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Important Notice */}
        <Grid item xs={12}>
          <Alert severity="warning" icon={<WarningIcon />}>
            <Typography variant="body2" fontWeight="medium" gutterBottom>
              Important Risk Disclosure
            </Typography>
            <Typography variant="body2">
              Risk management limits are designed to help prevent excessive losses, but they cannot
              guarantee protection against all risks. Market conditions, slippage, and other factors
              may cause actual results to differ from configured limits. Always trade responsibly
              and never risk more than you can afford to lose.
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default RiskManagement;
