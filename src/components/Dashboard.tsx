import { useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { fetchProfiles } from '../store/profilesSlice';
import { fetchPositions } from '../store/positionsSlice';

function Dashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { info: accountInfo, tradingMode } = useSelector((state: RootState) => state.account);
  const { profiles } = useSelector((state: RootState) => state.profiles);
  const { positions } = useSelector((state: RootState) => state.positions);

  useEffect(() => {
    dispatch(fetchProfiles());
    dispatch(fetchPositions());
  }, [dispatch]);

  const activeProfiles = profiles.filter((p) => p.schedule_enabled);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {/* Account Summary Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Account Summary
              </Typography>
              {accountInfo && (
                <>
                  <Typography variant="h5" component="div">
                    ${accountInfo.portfolio_value.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cash: ${accountInfo.cash.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Buying Power: ${accountInfo.buying_power.toLocaleString()}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Active Profiles Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Profiles
              </Typography>
              <Typography variant="h5" component="div">
                {activeProfiles.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Profiles: {profiles.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Open Positions Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Open Positions
              </Typography>
              <Typography variant="h5" component="div">
                {positions.length}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total P/L: $
                {positions
                  .reduce((sum, p) => sum + (p.unrealized_pl || 0), 0)
                  .toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary">
                New Scan
              </Button>
              <Button variant="outlined" color="primary">
                New Profile
              </Button>
              <Button variant="outlined" color="secondary">
                View Positions
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="textSecondary">
              No recent activity to display.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
