import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import communityReducer from './slices/communitySlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        ui: uiReducer,
        community: communityReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
