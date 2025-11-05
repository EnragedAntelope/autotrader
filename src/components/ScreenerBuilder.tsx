import { Box, Typography, Paper } from '@mui/material';

function ScreenerBuilder() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Screener Builder
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="textSecondary">
          Screener builder will be implemented in Phase 3.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          This is where you'll create and manage screening profiles with various parameters
          for stocks and options.
        </Typography>
      </Paper>
    </Box>
  );
}

export default ScreenerBuilder;
