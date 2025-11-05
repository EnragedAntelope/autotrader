import { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Badge,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
  TrendingUp as TradingIcon,
  AccountBalance as AccountIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from './store';
import { fetchAccountInfo, fetchTradingMode } from './store/accountSlice';
import Dashboard from './components/Dashboard';
import ScreenerBuilder from './components/ScreenerBuilder';
import TradeHistory from './components/TradeHistory';
import RiskManagement from './components/RiskManagement';
import Settings from './components/Settings';
import NotificationCenter from './components/NotificationCenter';

const drawerWidth = 240;

type View = 'dashboard' | 'screener' | 'trades' | 'risk' | 'settings';

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  const { tradingMode, info: accountInfo } = useSelector((state: RootState) => state.account);
  const { unreadCount } = useSelector((state: RootState) => state.notifications);

  useEffect(() => {
    // Load initial data
    dispatch(fetchAccountInfo());
    dispatch(fetchTradingMode());

    // Set up notification listeners
    window.electron.onNotification((notification) => {
      console.log('Notification received:', notification);
      // Handle notification (could dispatch to Redux)
    });
  }, [dispatch]);

  const menuItems = [
    { id: 'dashboard' as View, label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'screener' as View, label: 'Screener Builder', icon: <FilterIcon /> },
    { id: 'trades' as View, label: 'Trade History', icon: <TradingIcon /> },
    { id: 'risk' as View, label: 'Risk Management', icon: <AccountIcon /> },
    { id: 'settings' as View, label: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleMenuClick = (view: View) => {
    setCurrentView(view);
    setDrawerOpen(false);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'screener':
        return <ScreenerBuilder />;
      case 'trades':
        return <TradeHistory />;
      case 'risk':
        return <RiskManagement />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Alpaca Trading Scanner
          </Typography>

          {/* Trading Mode Indicator */}
          <Chip
            label={`${tradingMode.toUpperCase()} MODE`}
            color={tradingMode === 'paper' ? 'success' : 'error'}
            size="small"
            sx={{ mr: 2, fontWeight: 'bold' }}
          />

          {/* Account Balance */}
          {accountInfo && (
            <Typography variant="body2" sx={{ mr: 2 }}>
              Balance: ${accountInfo.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          )}

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={() => setNotificationsPanelOpen(!notificationsPanelOpen)}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.id} disablePadding>
                <ListItemButton
                  selected={currentView === item.id}
                  onClick={() => handleMenuClick(item.id)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Notification Panel */}
      <Drawer
        anchor="right"
        open={notificationsPanelOpen}
        onClose={() => setNotificationsPanelOpen(false)}
      >
        <Box sx={{ width: 350 }}>
          <NotificationCenter onClose={() => setNotificationsPanelOpen(false)} />
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        {renderCurrentView()}
      </Box>
    </Box>
  );
}

export default App;
