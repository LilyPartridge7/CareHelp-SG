import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
    colorMode: 'light' | 'dark';
    searchQuery: string;
    sidebarOpen: boolean;
    createPostModalOpen: boolean;
}

const initialState: UIState = {
    colorMode: 'light', // Default to Light mode for Facebook/Reddit aesthetic
    searchQuery: '',
    sidebarOpen: false, // Hidden by default on all screens behind the hamburger menu
    createPostModalOpen: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.colorMode = state.colorMode === 'dark' ? 'light' : 'dark';
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        toggleSidebar: (state) => {
            state.sidebarOpen = !state.sidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.sidebarOpen = action.payload;
        },
        openCreatePostModal: (state) => {
            state.createPostModalOpen = true;
        },
        closeCreatePostModal: (state) => {
            state.createPostModalOpen = false;
        }
    },
});

export const { toggleTheme, setSearchQuery, toggleSidebar, setSidebarOpen, openCreatePostModal, closeCreatePostModal } = uiSlice.actions;

export default uiSlice.reducer;
