import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Paper, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import api from '../../api/axiosConfig';
import { useGoogleLogin } from '@react-oauth/google';
import GoogleIcon from '@mui/icons-material/Google';

const loginStyles = `
@keyframes shake {
  0% { transform: translateX(0); }
  25% { transform: translateX(-8px); }
  50% { transform: translateX(8px); }
  75% { transform: translateX(-8px); }
  100% { transform: translateX(0); }
}
`;

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMSG, setErrorMSG] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500); // Remove class after animation
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMSG(null);
        setIsSubmitting(true);

        try {
            const response = await api.post('/users/login', { username, password });

            if (response.data && response.data.token) {
                dispatch(loginSuccess({ token: response.data.token, username, role: response.data.role }));
                navigate('/');
            }
        } catch (err: any) {
            setErrorMSG(err.response?.data?.error || 'Failed to connect to the server.');
            triggerShake();
        } finally {
            setIsSubmitting(false);
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsSubmitting(true);
            try {
                const response = await api.post('/users/google-login', {
                    access_token: tokenResponse.access_token
                });

                if (response.data && response.data.token) {
                    dispatch(loginSuccess({ token: response.data.token, username: "Google User", role: response.data.role }));
                    navigate('/');
                }
            } catch (err: any) {
                setErrorMSG(err.response?.data?.error || 'Google login failed.');
                triggerShake();
            } finally {
                setIsSubmitting(false);
            }
        },
        onError: () => {
            setErrorMSG('Google Login Prompt Closed.');
            triggerShake();
        }
    });

    return (
        <Container maxWidth="sm">
            <style>{loginStyles}</style>
            <Box sx={{ mt: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 5,
                        width: '100%',
                        animation: isShaking ? 'shake 0.5s ease-in-out' : 'none',
                        border: isShaking ? '1px solid #ff4444' : '1px solid transparent',
                        transition: 'border 0.3s'
                    }}
                >
                    <Box>
                        <Typography component="h1" variant="h3" align="center" gutterBottom color="primary.main" sx={{ fontWeight: 800 }}>
                            CareHelp
                        </Typography>
                    </Box>
                    <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
                        Enter your username. Only enter a password if you secured your account during registration.
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                        <Button
                            variant="outlined"
                            startIcon={<GoogleIcon />}
                            onClick={() => loginWithGoogle()}
                            disabled={isSubmitting}
                            sx={{
                                color: 'text.primary',
                                borderColor: 'text.secondary',
                                px: 4,
                                py: 1.5,
                                borderRadius: 8,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: 'primary.light',
                                    color: 'white',
                                    borderColor: 'primary.light',
                                    transform: 'scale(1.05)',
                                    boxShadow: '0 4px 15px rgba(24, 118, 209, 0.4)'
                                }
                            }}
                        >
                            Continue with Google
                        </Button>
                    </Box>

                    <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 2 }}>
                        OR USE A LOCAL USERNAME
                    </Typography>

                    {errorMSG && <Alert severity="error" sx={{ mb: 3 }}>{errorMSG}</Alert>}

                    <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isSubmitting}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    transition: 'transform 0.2s',
                                    '&.Mui-focused': { transform: 'scale(1.02)' }
                                }
                            }}
                        />

                        <TextField
                            margin="normal"
                            fullWidth
                            id="password"
                            label="Password (Optional)"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isSubmitting}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    transition: 'transform 0.2s',
                                    '&.Mui-focused': { transform: 'scale(1.02)' }
                                }
                            }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={isSubmitting}
                            sx={{
                                mt: 2,
                                mb: 1,
                                py: 1.5,
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    backgroundColor: 'secondary.main',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
                                }
                            }}
                        >
                            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login;
