import axios from 'axios';
import Cookies from 'js-cookie';

// Always connect to the deployed Render backend for production data
const resolvedBaseUrl = 'https://carehelp-api.onrender.com/api';

const api = axios.create({
    baseURL: resolvedBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        // Mentors require JWT token cached on frontend. We stored it in 'jwt_token' cookie.
        const token = Cookies.get('jwt_token');

        // If the token exists, attach it to the `Authorization` header 
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Only treat genuine 401 Unauthorized as auth failures.
        // Do NOT logout on 404 "user not found" — that's just a missing public profile.
        if (error.response && error.response.status === 401) {
            Cookies.remove('jwt_token');
            Cookies.remove('username');
            // If we aren't already on the login page, redirect
            if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
