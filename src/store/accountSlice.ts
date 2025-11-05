import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AccountInfo, TradingMode } from '../types';

interface AccountState {
  info: AccountInfo | null;
  tradingMode: TradingMode;
  loading: boolean;
  error: string | null;
}

const initialState: AccountState = {
  info: null,
  tradingMode: 'paper',
  loading: false,
  error: null,
};

// Async thunks
export const fetchAccountInfo = createAsyncThunk(
  'account/fetchInfo',
  async () => {
    const info = await window.electron.getAccountInfo();
    return info;
  }
);

export const fetchTradingMode = createAsyncThunk(
  'account/fetchMode',
  async () => {
    const mode = await window.electron.getTradingMode();
    return mode;
  }
);

export const setTradingMode = createAsyncThunk(
  'account/setMode',
  async (mode: TradingMode) => {
    const result = await window.electron.setTradingMode(mode);
    return result.mode;
  }
);

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch account info
      .addCase(fetchAccountInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccountInfo.fulfilled, (state, action: PayloadAction<AccountInfo>) => {
        state.loading = false;
        state.info = action.payload;
      })
      .addCase(fetchAccountInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch account info';
      })
      // Fetch trading mode
      .addCase(fetchTradingMode.fulfilled, (state, action: PayloadAction<TradingMode>) => {
        state.tradingMode = action.payload;
      })
      // Set trading mode
      .addCase(setTradingMode.fulfilled, (state, action: PayloadAction<TradingMode>) => {
        state.tradingMode = action.payload;
      });
  },
});

export const { clearError } = accountSlice.actions;
export default accountSlice.reducer;
