import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { SchedulerStatus } from '../types';

interface SchedulerState {
  status: SchedulerStatus;
  loading: boolean;
  error: string | null;
}

const initialState: SchedulerState = {
  status: {
    isRunning: false,
    activeJobs: 0,
    scheduledProfiles: [],
  },
  loading: false,
  error: null,
};

export const fetchSchedulerStatus = createAsyncThunk(
  'scheduler/fetchStatus',
  async () => {
    const status = await window.electron.getSchedulerStatus();
    return status;
  }
);

export const startScheduler = createAsyncThunk(
  'scheduler/start',
  async () => {
    await window.electron.startScheduler();
    const status = await window.electron.getSchedulerStatus();
    return status;
  }
);

export const stopScheduler = createAsyncThunk(
  'scheduler/stop',
  async () => {
    await window.electron.stopScheduler();
    const status = await window.electron.getSchedulerStatus();
    return status;
  }
);

const schedulerSlice = createSlice({
  name: 'scheduler',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedulerStatus.fulfilled, (state, action: PayloadAction<SchedulerStatus>) => {
        state.status = action.payload;
      })
      .addCase(startScheduler.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startScheduler.fulfilled, (state, action: PayloadAction<SchedulerStatus>) => {
        state.loading = false;
        state.status = action.payload;
      })
      .addCase(startScheduler.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to start scheduler';
      })
      .addCase(stopScheduler.fulfilled, (state, action: PayloadAction<SchedulerStatus>) => {
        state.status = action.payload;
      });
  },
});

export const { clearError } = schedulerSlice.actions;
export default schedulerSlice.reducer;
