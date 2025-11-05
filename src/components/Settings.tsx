import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlRadio,
  Radio,
  FormControlLabel,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { setTradingMode } from '../store/accountSlice';
import { TradingMode } from '../types';

function Settings() {
  const dispatch = useDispatch<AppDispatch>();
  const { tradingMode } = useSelector((state: RootState) => state.account);
  const [selectedMode, setSelectedMode] = useState<TradingMode>(tradingMode);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleModeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newMode = event.target.value as TradingMode;
    setSelectedMode(newMode);

    if (newMode === 'live') {
      setConfirmDialogOpen(true);
    } else {
      dispatch(setTradingMode(newMode));
    }
  };

  const handleConfirmLiveMode = () => {
    dispatch(setTradingMode('live'));
    setConfirmDialogOpen(false);
  };

  const handleCancelLiveMode = () => {
    setSelectedMode('paper');
    setConfirmDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

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
