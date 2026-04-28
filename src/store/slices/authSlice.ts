import { createSlice } from '@reduxjs/toolkit';

export interface AuthState {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: { id: 1, name: 'Field Rep' }, // mock user for this assignment
  token: 'mock',
  isAuthenticated: true,
  loading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
});

export default authSlice.reducer;
