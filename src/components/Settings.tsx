import { useState, useEffect, useContext } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Grid,
  Switch,
  Divider,
  MenuItem,
  Select,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  SystemUpdate as UpdateIcon,
  CheckCircle as CheckIcon,
  NewReleases as NewReleaseIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setTradingMode, fetchAccountInfo } from '../store/accountSlice';
import { fetchPositions } from '../store/positionsSlice';
import { TradingMode } from '../types';
import { ThemeContext } from '../theme/ThemeContext';

interface AppSettings {
  theme: string;
  notifications_enabled: string;
  sound_alerts: string;
  default_order_type: string;
  limit_price_offset_percent: string;
  alpaca_rate_limit_per_minute: string;
  alpha_vantage_rate_limit_per_minute: string;
  alpha_vantage_rate_limit_per_day: string;
}

function Settings() {
  const dispatch = useDispatch<AppDispatch>();
  const { tradingMode } = useSelector((state: RootState) => state.account);
  const { mode, toggleTheme } = useContext(ThemeContext);
  const [selectedMode, setSelectedMode] = useState<TradingMode>(tradingMode);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // App settings state
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'light',
    notifications_enabled: 'true',
    sound_alerts: 'false',
    default_order_type: 'limit',
    limit_price_offset_percent: '0.5',
    alpaca_rate_limit_per_minute: '10000',
    alpha_vantage_rate_limit_per_minute: '5',
    alpha_vantage_rate_limit_per_day: '25',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update checker state
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // Theme toggle handler with notification
  const handleThemeToggle = () => {
    toggleTheme();
    const newMode = mode === 'light' ? 'dark' : 'light';
    setSuccess(`Theme changed to ${newMode} mode`);
    setTimeout(() => setSuccess(null), 3000);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const appSettings = await window.electron.getAppSettings();
      setSettings(appSettings as AppSettings);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(`Failed to load settings: ${err.message}`);
    }
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMode = event.target.value as TradingMode;
    setSelectedMode(newMode);

    if (newMode === 'live') {
      setConfirmDialogOpen(true);
    } else {
      // Switch to paper mode and refresh data
      dispatch(setTradingMode(newMode)).then(() => {
        dispatch(fetchAccountInfo());
        dispatch(fetchPositions());
      });
    }
  };

  const handleConfirmLiveMode = () => {
    // Switch to live mode and refresh data
    dispatch(setTradingMode('live')).then(() => {
      dispatch(fetchAccountInfo());
      dispatch(fetchPositions());
    });
    setConfirmDialogOpen(false);
  };

  const handleCancelLiveMode = () => {
    setSelectedMode('paper');
    setConfirmDialogOpen(false);
  };

  const handleSettingChange = (key: keyof AppSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await window.electron.checkForUpdates();
      setUpdateInfo(result);

      if (result.error) {
        setError(`Update check failed: ${result.error}`);
      } else if (result.updateAvailable) {
        setSuccess(`🎉 New version ${result.latestVersion} is available! See details below.`);
        setTimeout(() => setSuccess(null), 8000);
      } else {
        setSuccess(`✅ You're up to date! Running version ${result.currentVersion}`);
        setTimeout(() => setSuccess(null), 6000);
      }
    } catch (err: any) {
      console.error('Error checking for updates:', err);
      setError(`Failed to check for updates: ${err.message}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electron.updateAppSettings(settings);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Failed to save settings: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSettings = () => {
    loadSettings();
    setSuccess('Settings refreshed');
    setTimeout(() => setSuccess(null), 2000);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Settings</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshSettings}
            disabled={loading}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            disabled={loading}
          >
            Save All Settings
          </Button>
        </Box>
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

      {/* Theme Toggle */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Appearance
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body1">Theme Mode</Typography>
            <Typography variant="body2" color="textSecondary">
              Switch between light and dark theme
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LightModeIcon color={mode === 'light' ? 'primary' : 'disabled'} />
            <Switch
              checked={mode === 'dark'}
              onChange={handleThemeToggle}
              color="primary"
            />
            <DarkModeIcon color={mode === 'dark' ? 'primary' : 'disabled'} />
          </Box>
        </Box>
      </Paper>

      {/* Trading Mode */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Trading Mode
        </Typography>
        <FormControl component="fieldset">
          <RadioGroup value={selectedMode} onChange={handleModeChange}>
            <FormControlLabel value="paper" control={<Radio />} label="Paper Trading (Recommended)" />
            <FormControlLabel value="live" control={<Radio />} label="Live Trading (Real Money)" />
          </RadioGroup>
        </FormControl>

        {tradingMode === 'paper' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            You are currently in PAPER TRADING mode. No real money will be used.
          </Alert>
        )}

        {tradingMode === 'live' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            ⚠️ You are in LIVE TRADING mode. Real money will be used for trades.
          </Alert>
        )}
      </Paper>

      {/* Rate Limiting Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          API Rate Limiting
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Configure rate limits to prevent exceeding API quotas. Adjust based on your API plan tier.
        </Typography>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
          Alpaca API Rate Limits
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Requests Per Minute"
              type="number"
              value={settings.alpaca_rate_limit_per_minute}
              onChange={(e) => handleSettingChange('alpaca_rate_limit_per_minute', e.target.value)}
              helperText="Default: 10,000 for paid plans, 200 for free tier"
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Alert severity="info" sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
              Alpaca has no daily limit
            </Alert>
          </Grid>
        </Grid>

        <Divider sx={{ mt: 3, mb: 3 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Alpha Vantage API Rate Limits
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Requests Per Minute"
              type="number"
              value={settings.alpha_vantage_rate_limit_per_minute}
              onChange={(e) => handleSettingChange('alpha_vantage_rate_limit_per_minute', e.target.value)}
              helperText="Default: 5 for free tier, 15-75 for paid plans"
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Requests Per Day"
              type="number"
              value={settings.alpha_vantage_rate_limit_per_day}
              onChange={(e) => handleSettingChange('alpha_vantage_rate_limit_per_day', e.target.value)}
              helperText="Default: 25 for free tier, 150-1200 for paid plans"
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
        </Grid>

        <Alert severity="warning" sx={{ mt: 3 }}>
          Setting rate limits too high may result in API errors or account suspension.
          Consult your API provider documentation for your plan limits.
        </Alert>
      </Paper>

      {/* Order Execution Preferences */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Order Execution Preferences
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Configure default order execution settings for automated trades.
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Default Order Type</InputLabel>
              <Select
                value={settings.default_order_type}
                label="Default Order Type"
                onChange={(e) => handleSettingChange('default_order_type', e.target.value)}
              >
                <MenuItem value="market">Market Order</MenuItem>
                <MenuItem value="limit">Limit Order</MenuItem>
              </Select>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Market orders execute immediately at current price. Limit orders execute at your specified price or better.
              </Typography>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Limit Price Offset (%)"
              type="number"
              value={settings.limit_price_offset_percent}
              onChange={(e) => handleSettingChange('limit_price_offset_percent', e.target.value)}
              helperText="For limit orders: % above ask (buy) or below bid (sell)"
              InputProps={{ inputProps: { min: 0, max: 10, step: 0.1 } }}
              disabled={settings.default_order_type === 'market'}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Notification Preferences */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Notification Preferences
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Configure how you receive alerts and notifications.
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications_enabled === 'true'}
                  onChange={(e) => handleSettingChange('notifications_enabled', e.target.checked ? 'true' : 'false')}
                />
              }
              label="Enable Notifications"
            />
            <Typography variant="caption" color="textSecondary" display="block" sx={{ ml: 4 }}>
              Receive in-app notifications for scans, trades, and alerts
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.sound_alerts === 'true'}
                  onChange={(e) => handleSettingChange('sound_alerts', e.target.checked ? 'true' : 'false')}
                  disabled={settings.notifications_enabled === 'false'}
                />
              }
              label="Sound Alerts"
            />
            <Typography variant="caption" color="textSecondary" display="block" sx={{ ml: 4 }}>
              Play sound when important notifications arrive
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Application Updates */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Application Updates
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Check for new versions of the Alpaca Trading Scanner
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            startIcon={checkingUpdate ? <RefreshIcon className="spin" /> : <UpdateIcon />}
            onClick={checkForUpdates}
            disabled={checkingUpdate}
          >
            {checkingUpdate ? 'Checking...' : 'Check for Updates'}
          </Button>

          {updateInfo && !updateInfo.error && (
            <Chip
              icon={updateInfo.updateAvailable ? <NewReleaseIcon /> : <CheckIcon />}
              label={
                updateInfo.updateAvailable
                  ? `v${updateInfo.latestVersion} available`
                  : `v${updateInfo.currentVersion} (latest)`
              }
              color={updateInfo.updateAvailable ? 'warning' : 'success'}
            />
          )}
        </Box>

        {updateInfo && updateInfo.error && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              ℹ️ Update Check Result
            </Typography>
            <Typography variant="body2">
              {updateInfo.error}
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
              Current version: {updateInfo.currentVersion}
            </Typography>
          </Alert>
        )}

        {updateInfo && updateInfo.updateAvailable && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              🎉 New version available: v{updateInfo.latestVersion}
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Current version: v{updateInfo.currentVersion}
            </Typography>
            {updateInfo.releaseNotes && (
              <Typography variant="caption" component="div" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
                {updateInfo.releaseNotes.length > 300
                  ? updateInfo.releaseNotes.substring(0, 300) + '...'
                  : updateInfo.releaseNotes}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              How to update (Development Mode):
            </Typography>
            <Box component="ol" sx={{ pl: 2, mb: 2 }}>
              <li>
                <Typography variant="body2">
                  Open terminal in your app directory
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Run: <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>git pull origin main</code>
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Run: <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>npm install</code> (if dependencies changed)
                </Typography>
              </li>
              <li>
                <Typography variant="body2">
                  Restart the application
                </Typography>
              </li>
            </Box>

            <Button
              variant="outlined"
              size="small"
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ mt: 1 }}
            >
              View Full Release Notes on GitHub
            </Button>
          </Alert>
        )}

        {updateInfo && !updateInfo.updateAvailable && !updateInfo.error && (
          <Alert severity="success">
            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
              ✅ You're up to date!
            </Typography>
            <Typography variant="body2">
              Running the latest version: v{updateInfo.currentVersion}
            </Typography>
            {updateInfo.publishedAt && (
              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                Released: {new Date(updateInfo.publishedAt).toLocaleDateString()}
              </Typography>
            )}
          </Alert>
        )}
      </Paper>

      {/* API Configuration */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          API Configuration
        </Typography>
        <Typography variant="body2" color="textSecondary">
          API keys are configured in the .env file and cannot be changed from the UI for security reasons.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          To change your API keys, edit the .env file and restart the application.
        </Typography>
      </Paper>

      {/* Live Mode Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onClose={handleCancelLiveMode}>
        <DialogTitle>⚠️ WARNING: Switch to Live Trading?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to switch to LIVE TRADING mode. This means:
          </DialogContentText>
          <Box component="ul" sx={{ mt: 2, color: 'error.main' }}>
            <li>Real money will be used for all trades</li>
            <li>All orders will be executed on real markets</li>
            <li>You can lose real money</li>
            <li>There is no undo</li>
          </Box>
          <DialogContentText sx={{ mt: 2, fontWeight: 'bold' }}>
            Are you absolutely sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLiveMode} color="primary" variant="contained">
            No, Keep Paper Trading
          </Button>
          <Button onClick={handleConfirmLiveMode} color="error" variant="outlined">
            Yes, Switch to Live
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Settings;
