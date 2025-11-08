import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { ScreeningProfile, SchedulerStatus } from '../types';

interface ScanHistory {
  id: number;
  profile_id: number;
  profile_name: string;
  scan_timestamp: string;
  matches_found: number;
  status: 'success' | 'error';
  error_message?: string;
}

function Scheduler() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [scheduledProfiles, setScheduledProfiles] = useState<ScreeningProfile[]>([]);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [runningScans, setRunningScans] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadSchedulerStatus();
    loadScheduledProfiles();
    loadScanHistory();

    // Refresh status every 10 seconds
    const interval = setInterval(() => {
      loadSchedulerStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const loadSchedulerStatus = async () => {
    try {
      const status = await window.electron.getSchedulerStatus();
      setSchedulerStatus(status);
    } catch (err: any) {
      console.error('Failed to load scheduler status:', err);
    }
  };

  const loadScheduledProfiles = async () => {
    try {
      const allProfiles = await window.electron.getProfiles();
      const scheduled = allProfiles.filter((p) => p.schedule_enabled);
      setScheduledProfiles(scheduled);
    } catch (err: any) {
      setError(`Failed to load profiles: ${err.message}`);
    }
  };

  const loadScanHistory = async () => {
    try {
      // Load recent scan results across all profiles
      // We'll fetch the last 20 results for now
      const allProfiles = await window.electron.getProfiles();
      const history: ScanHistory[] = [];

      for (const profile of allProfiles.slice(0, 5)) {
        // Limit to 5 profiles for performance
        try {
          const results = await window.electron.getScanResults(profile.id!, 5);
          for (const result of results) {
            history.push({
              id: result.id,
              profile_id: profile.id!,
              profile_name: profile.name,
              scan_timestamp: result.scan_timestamp,
              matches_found: 1, // Each result is a match
              status: 'success',
            });
          }
        } catch (err) {
          // Profile might not have results yet
          continue;
        }
      }

      // Sort by timestamp descending
      history.sort(
        (a, b) => new Date(b.scan_timestamp).getTime() - new Date(a.scan_timestamp).getTime()
      );

      setScanHistory(history.slice(0, 20));
    } catch (err: any) {
      console.error('Failed to load scan history:', err);
    }
  };

  const handleStartScheduler = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electron.startScheduler();
      setSuccess('Scheduler started successfully');
      await loadSchedulerStatus();
    } catch (err: any) {
      setError(`Failed to start scheduler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStopScheduler = async () => {
    setLoading(true);
    setError(null);
    try {
      await window.electron.stopScheduler();
      setSuccess('Scheduler stopped successfully');
      await loadSchedulerStatus();
    } catch (err: any) {
      setError(`Failed to stop scheduler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async (profileId: number, profileName: string) => {
    setRunningScans((prev) => new Set(prev).add(profileId));
    setError(null);
    try {
      const results = await window.electron.runScan(profileId);
      setSuccess(
        `Scan complete for "${profileName}": Found ${results.length} match(es)`
      );
      await loadScanHistory();
    } catch (err: any) {
      setError(`Failed to run scan for "${profileName}": ${err.message}`);
    } finally {
      setRunningScans((prev) => {
        const next = new Set(prev);
        next.delete(profileId);
        return next;
      });
    }
  };

  const handleRefresh = () => {
    loadSchedulerStatus();
    loadScheduledProfiles();
    loadScanHistory();
    setSuccess('Refreshed successfully');
  };

  const formatNextRun = (interval: number) => {
    if (!schedulerStatus?.isRunning) {
      return 'Scheduler stopped';
    }
    if (interval < 60) {
      return `Next: ~${interval}m`;
    }
    return `Next: ~${Math.floor(interval / 60)}h`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Scheduler</Typography>
        <Box>
          <Tooltip title="Refresh">
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <IconButton onClick={handleRefresh} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Box>
          </Tooltip>
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

      {/* Scheduler Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ScheduleIcon fontSize="large" color="primary" />
            <Box>
              <Typography variant="h6">Scheduler Status</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Chip
                  label={schedulerStatus?.isRunning ? 'RUNNING' : 'STOPPED'}
                  color={schedulerStatus?.isRunning ? 'success' : 'default'}
                  size="small"
                />
                <Typography variant="body2" color="textSecondary">
                  {schedulerStatus?.activeJobs || 0} active job(s)
                </Typography>
              </Box>
            </Box>
          </Box>
          <Box>
            {schedulerStatus?.isRunning ? (
              <Button
                variant="contained"
                color="error"
                startIcon={<StopIcon />}
                onClick={handleStopScheduler}
                disabled={loading}
              >
                Stop Scheduler
              </Button>
            ) : (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayIcon />}
                onClick={handleStartScheduler}
                disabled={loading || scheduledProfiles.length === 0}
              >
                Start Scheduler
              </Button>
            )}
          </Box>
        </Box>

        {scheduledProfiles.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No profiles are scheduled. Enable scheduling in the Screener Builder to get started.
          </Alert>
        )}
      </Paper>

      {/* Scheduled Profiles */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Scheduled Profiles ({scheduledProfiles.length})
      </Typography>

      {scheduledProfiles.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No scheduled profiles yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Go to Screener Builder and enable scheduling for a profile
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {scheduledProfiles.map((profile) => (
            <Grid item xs={12} md={6} key={profile.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {profile.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                        <Chip
                          label={profile.asset_type.replace('_', ' ')}
                          size="small"
                          color={profile.asset_type === 'stock' ? 'primary' : 'secondary'}
                        />
                        <Chip
                          label={`Every ${profile.schedule_interval}m`}
                          size="small"
                          icon={<TimeIcon />}
                        />
                      </Box>
                    </Box>
                    {runningScans.has(profile.id!) && <LinearProgress sx={{ width: '100%' }} />}
                  </Box>

                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {formatNextRun(profile.schedule_interval)}
                  </Typography>

                  {profile.schedule_market_hours_only && (
                    <Typography variant="caption" color="textSecondary">
                      Market hours only
                    </Typography>
                  )}

                  {profile.auto_execute && (
                    <Chip
                      label="Auto-Execute Enabled"
                      size="small"
                      color="warning"
                      sx={{ mt: 1 }}
                    />
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<PlayIcon />}
                    onClick={() => handleManualScan(profile.id!, profile.name)}
                    disabled={runningScans.has(profile.id!)}
                  >
                    {runningScans.has(profile.id!) ? 'Running...' : 'Run Now'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Scan History */}
      <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
        Recent Scan History
      </Typography>

      {scanHistory.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No scan history yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Scans will appear here after they run
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <List>
            {scanHistory.map((scan, index) => (
              <Box key={scan.id}>
                <ListItem>
                  <ListItemText
                    primaryTypographyProps={{ component: 'div' }}
                    secondaryTypographyProps={{ component: 'div' }}
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {scan.status === 'success' ? (
                          <CheckIcon fontSize="small" color="success" />
                        ) : (
                          <ErrorIcon fontSize="small" color="error" />
                        )}
                        <Typography variant="body1">{scan.profile_name}</Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {formatTimestamp(scan.scan_timestamp)}
                        </Typography>
                        {scan.status === 'success' ? (
                          <Typography variant="caption" color="textSecondary">
                            Found {scan.matches_found} match(es)
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="error">
                            {scan.error_message || 'Scan failed'}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(scan.scan_timestamp).toLocaleTimeString()}
                    </Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < scanHistory.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

export default Scheduler;
