import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ScreeningProfile } from '../types';

interface ProfilesState {
  profiles: ScreeningProfile[];
  selectedProfile: ScreeningProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfilesState = {
  profiles: [],
  selectedProfile: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchProfiles = createAsyncThunk(
  'profiles/fetchAll',
  async () => {
    const profiles = await window.electron.getProfiles();
    return profiles;
  }
);

export const createProfile = createAsyncThunk(
  'profiles/create',
  async (profile: Omit<ScreeningProfile, 'id'>) => {
    const newProfile = await window.electron.createProfile(profile);
    return newProfile;
  }
);

export const updateProfile = createAsyncThunk(
  'profiles/update',
  async ({ id, updates }: { id: number; updates: Partial<ScreeningProfile> }) => {
    await window.electron.updateProfile(id, updates);
    return { id, updates };
  }
);

export const deleteProfile = createAsyncThunk(
  'profiles/delete',
  async (id: number) => {
    await window.electron.deleteProfile(id);
    return id;
  }
);

const profilesSlice = createSlice({
  name: 'profiles',
  initialState,
  reducers: {
    selectProfile: (state, action: PayloadAction<ScreeningProfile | null>) => {
      state.selectedProfile = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch profiles
      .addCase(fetchProfiles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfiles.fulfilled, (state, action: PayloadAction<ScreeningProfile[]>) => {
        state.loading = false;
        state.profiles = action.payload;
      })
      .addCase(fetchProfiles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch profiles';
      })
      // Create profile
      .addCase(createProfile.fulfilled, (state, action: PayloadAction<ScreeningProfile>) => {
        state.profiles.push(action.payload);
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        const { id, updates } = action.payload;
        const index = state.profiles.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.profiles[index] = { ...state.profiles[index], ...updates };
        }
        if (state.selectedProfile?.id === id) {
          state.selectedProfile = { ...state.selectedProfile, ...updates };
        }
      })
      // Delete profile
      .addCase(deleteProfile.fulfilled, (state, action: PayloadAction<number>) => {
        state.profiles = state.profiles.filter((p) => p.id !== action.payload);
        if (state.selectedProfile?.id === action.payload) {
          state.selectedProfile = null;
        }
      });
  },
});

export const { selectProfile, clearError } = profilesSlice.actions;
export default profilesSlice.reducer;
