import { configureStore } from '@reduxjs/toolkit';
import accountReducer from './accountSlice';
import profilesReducer from './profilesSlice';
import tradesReducer from './tradesSlice';
import positionsReducer from './positionsSlice';
import notificationsReducer from './notificationsSlice';
import schedulerReducer from './schedulerSlice';

export const store = configureStore({
  reducer: {
    account: accountReducer,
    profiles: profilesReducer,
    trades: tradesReducer,
    positions: positionsReducer,
    notifications: notificationsReducer,
    scheduler: schedulerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
