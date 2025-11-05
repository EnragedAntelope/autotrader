import { Box, Typography, Paper } from '@mui/material';

function TradeHistory() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Trade History
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="textSecondary">
          Trade history view will be implemented in Phase 4.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          This will show all executed trades with filters for date, symbol, status, and more.
        </Typography>
      </Paper>
    </Box>
  );
}

export default TradeHistory;
