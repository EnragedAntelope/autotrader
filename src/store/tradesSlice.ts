import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Trade, TradeHistoryFilters } from '../types';

interface TradesState {
  trades: Trade[];
  loading: boolean;
  error: string | null;
}

const initialState: TradesState = {
  trades: [],
  loading: false,
  error: null,
};

export const fetchTradeHistory = createAsyncThunk(
  'trades/fetchHistory',
  async (filters?: TradeHistoryFilters) => {
    const trades = await window.electron.getTradeHistory(filters);
    return trades;
  }
);

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTradeHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTradeHistory.fulfilled, (state, action: PayloadAction<Trade[]>) => {
        state.loading = false;
        state.trades = action.payload;
      })
      .addCase(fetchTradeHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch trade history';
      });
  },
});

export const { clearError } = tradesSlice.actions;
export default tradesSlice.reducer;
