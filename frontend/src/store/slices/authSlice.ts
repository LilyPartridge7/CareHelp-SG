import { createSlice, current } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';

interface AuthState {
    token: string | null;
    isAuthenticated: boolean;
    username: string | null;
    role: string | null;
    upvotedPosts: number[];
    dislikedPosts: number[];
    repostedPosts: number[];
    reactedPosts: Record<number, string>;
    lovedComments: number[];
}


const safeParseJSON = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch {
        return fallback;
    }
};

const initialState: AuthState = {
    token: Cookies.get('jwt_token') || null,
    isAuthenticated: !!Cookies.get('jwt_token'),
    username: Cookies.get('username') || null,
    role: Cookies.get('user_role') || null,
    upvotedPosts: safeParseJSON('upvotedPosts', []),
    dislikedPosts: safeParseJSON('dislikedPosts', []),
    repostedPosts: safeParseJSON('repostedPosts', []),
    reactedPosts: safeParseJSON('reactedPosts', {}),
    lovedComments: safeParseJSON('lovedComments', []),
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        loginSuccess: (state, action: PayloadAction<{ token: string; username: string; role?: string }>) => {
            state.token = action.payload.token;
            state.isAuthenticated = true;
            state.username = action.payload.username;
            if (action.payload.role) {
                state.role = action.payload.role;
                Cookies.set('user_role', action.payload.role, { expires: 3 });
            }

            // Store in cookies for persistence (per mentor advice)
            Cookies.set('jwt_token', action.payload.token, { expires: 3 }); // 3 days
            Cookies.set('username', action.payload.username, { expires: 3 });
        },
        logout: (state) => {
            state.token = null;
            state.isAuthenticated = false;
            state.username = null;
            state.role = null;
            state.upvotedPosts = [];
            state.dislikedPosts = [];
            state.repostedPosts = [];
            state.reactedPosts = {};
            state.lovedComments = [];

            Cookies.remove('jwt_token');
            Cookies.remove('username');
            Cookies.remove('user_role');
            localStorage.removeItem('upvotedPosts');
            localStorage.removeItem('dislikedPosts');
            localStorage.removeItem('repostedPosts');
            localStorage.removeItem('reactedPosts');
            localStorage.removeItem('lovedComments');
        },
        toggleUpvote: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            if (state.upvotedPosts.includes(id)) {
                state.upvotedPosts = state.upvotedPosts.filter(pId => pId !== id);
            } else {
                state.upvotedPosts.push(id);
                state.dislikedPosts = state.dislikedPosts.filter(pId => pId !== id); // mutually exclusive
            }
            localStorage.setItem('upvotedPosts', JSON.stringify(current(state).upvotedPosts));
            localStorage.setItem('dislikedPosts', JSON.stringify(current(state).dislikedPosts));
        },
        toggleDislike: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            if (state.dislikedPosts.includes(id)) {
                state.dislikedPosts = state.dislikedPosts.filter(pId => pId !== id);
            } else {
                state.dislikedPosts.push(id);
                state.upvotedPosts = state.upvotedPosts.filter(pId => pId !== id); // mutually exclusive
            }
            localStorage.setItem('upvotedPosts', JSON.stringify(current(state).upvotedPosts));
            localStorage.setItem('dislikedPosts', JSON.stringify(current(state).dislikedPosts));
        },
        toggleRepost: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            if (state.repostedPosts.includes(id)) {
                state.repostedPosts = state.repostedPosts.filter(pId => pId !== id);
            } else {
                state.repostedPosts.push(id);
            }
            localStorage.setItem('repostedPosts', JSON.stringify(current(state).repostedPosts));
        },
        toggleReaction: (state, action: PayloadAction<{ id: number, emoji: string }>) => {
            const { id, emoji } = action.payload;
            if (state.reactedPosts[id] === emoji) {
                delete state.reactedPosts[id]; // Toggle off if already selected
            } else {
                state.reactedPosts[id] = emoji;
            }
            localStorage.setItem('reactedPosts', JSON.stringify(current(state).reactedPosts));
        },
        toggleLoveComment: (state, action: PayloadAction<number>) => {
            const id = action.payload;
            if (state.lovedComments.includes(id)) {
                state.lovedComments = state.lovedComments.filter(cId => cId !== id);
            } else {
                state.lovedComments.push(id);
            }
            localStorage.setItem('lovedComments', JSON.stringify(current(state).lovedComments));
        },
        syncInteractions: (state, action: PayloadAction<{
            upvotedPosts?: number[],
            dislikedPosts?: number[],
            repostedPosts?: number[],
            reactedPosts?: Record<number, string>,
            lovedComments?: number[]
        }>) => {
            if (action.payload.upvotedPosts) {
                state.upvotedPosts = action.payload.upvotedPosts;
                localStorage.setItem('upvotedPosts', JSON.stringify(state.upvotedPosts));
            }
            if (action.payload.dislikedPosts) {
                state.dislikedPosts = action.payload.dislikedPosts;
                localStorage.setItem('dislikedPosts', JSON.stringify(state.dislikedPosts));
            }
            if (action.payload.repostedPosts) {
                state.repostedPosts = action.payload.repostedPosts;
                localStorage.setItem('repostedPosts', JSON.stringify(state.repostedPosts));
            }
            if (action.payload.reactedPosts) {
                state.reactedPosts = action.payload.reactedPosts;
                localStorage.setItem('reactedPosts', JSON.stringify(state.reactedPosts));
            }
            if (action.payload.lovedComments) {
                state.lovedComments = action.payload.lovedComments;
                localStorage.setItem('lovedComments', JSON.stringify(state.lovedComments));
            }
        }
    },
});

export const { loginSuccess, logout, toggleUpvote, toggleDislike, toggleRepost, toggleReaction, toggleLoveComment, syncInteractions } = authSlice.actions;

export default authSlice.reducer;
