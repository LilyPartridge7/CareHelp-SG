import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosConfig';

interface Community {
    id: number;
    name: string;
    description: string;
}

interface CommunityState {
    allCommunities: Community[];
    myCommunities: Community[];
    loading: boolean;
    error: string | null;
}

const initialState: CommunityState = {
    allCommunities: [],
    myCommunities: [],
    loading: false,
    error: null,
};

export const fetchCommunities = createAsyncThunk(
    'community/fetchCommunities',
    async (isAuthenticated: boolean, { rejectWithValue }) => {
        try {
            const allRes = await api.get('/communities');
            let myCommunities = [];
            if (isAuthenticated) {
                const myRes = await api.get('/users/me/communities');
                myCommunities = myRes.data || [];
            }
            return { all: allRes.data || [], my: myCommunities };
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.error || 'Failed to fetch communities');
        }
    }
);

const communitySlice = createSlice({
    name: 'community',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchCommunities.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchCommunities.fulfilled, (state, action) => {
                state.loading = false;
                state.allCommunities = action.payload.all;
                state.myCommunities = action.payload.my;
            })
            .addCase(fetchCommunities.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export default communitySlice.reducer;
