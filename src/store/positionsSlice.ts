import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Position } from '../types';

interface PositionsState {
  positions: Position[];
  loading: boolean;
  error: string | null;
}

const initialState: PositionsState = {
  positions: [],
  loading: false,
  error: null,
};

export const fetchPositions = createAsyncThunk(
  'positions/fetchAll',
  async () => {
    const positions = await window.electron.getPositions();
    return positions;
  }
);

export const updatePosition = createAsyncThunk(
  'positions/update',
  async ({ id, updates }: { id: number; updates: { stop_loss_percent: number; take_profit_percent: number } }) => {
    await window.electron.updatePosition(id, updates);
    return { id, updates };
  }
);

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPositions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPositions.fulfilled, (state, action: PayloadAction<Position[]>) => {
        state.loading = false;
        state.positions = action.payload;
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch positions';
      })
      .addCase(updatePosition.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.positions.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.positions[index] = { ...state.positions[index], ...updates };
        }
      });
  },
});

export const { clearError } = positionsSlice.actions;
export default positionsSlice.reducer;
