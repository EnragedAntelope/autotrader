import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Button,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { markAllAsRead, clearNotifications } from '../store/notificationsSlice';

interface Props {
  onClose: () => void;
}

function NotificationCenter({ onClose }: Props) {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notifications);

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  const handleClearAll = () => {
    dispatch(clearNotifications());
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Actions */}
      {notifications.length > 0 && (
        <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
          <Button size="small" onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
          <Button size="small" color="error" onClick={handleClearAll}>
            Clear All
          </Button>
        </Box>
      )}

      <Divider />

      {/* Notifications List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              No notifications
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification) => (
              <ListItem
                key={notification.id}
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'action.hover',
                }}
              >
                <ListItemText
                  primary={notification.title}
                  secondary={
                    <>
                      <Typography variant="body2" component="span">
                        {notification.message}
                      </Typography>
                      {notification.timestamp && (
                        <Typography variant="caption" display="block" color="textSecondary" sx={{ mt: 0.5 }}>
                          {new Date(notification.timestamp).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      )}
                    </>
                  }
                  primaryTypographyProps={{
                    fontWeight: notification.read ? 'normal' : 'bold',
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}

export default NotificationCenter;
