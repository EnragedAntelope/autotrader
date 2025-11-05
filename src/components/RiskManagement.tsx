import { Box, Typography, Paper } from '@mui/material';

function RiskManagement() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Risk Management
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="textSecondary">
          Risk management controls will be implemented in Phase 4.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          Configure transaction limits, daily/weekly spend limits, position limits, and
          stop-loss/take-profit defaults.
        </Typography>
      </Paper>
    </Box>
  );
}

export default RiskManagement;
