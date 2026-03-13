import React, { useState, useEffect } from 'react';
import { Container, Box, Typography, TextField, Button, Alert, Paper, Divider } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import api from '../../api/axiosConfig';
import { useGoogleLogin } from '@react-oauth/google';
import GoogleIcon from '@mui/icons-material/Google';

const Register: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMSG, setErrorMSG] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [isTaken, setIsTaken] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        if (!username || username.length < 3) {
            setIsTaken(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsChecking(true);
            try {
                const res = await api.get(`/users/check-username?username=${username}`);
                setIsTaken(!res.data.available);
            } catch (err) {
                console.error("Error checking username:", err);
            } finally {
                setIsChecking(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [username]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMSG(null);

        if (password && password.length < 6) {
            setErrorMSG("If providing a password, it must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMSG("Passwords do not match.");
            return;
        }

        try {
            const createRes = await api.post('/users/register', { username, password });

            // After successful register, we auto login
            if (createRes.status === 201) {
                const loginRes = await api.post('/users/login', { username, password });
                if (loginRes.data && loginRes.data.token) {
                    dispatch(loginSuccess({ token: loginRes.data.token, username, role: loginRes.data.role }));
                    navigate('/');
                }
            }
        } catch (err: any) {
            setErrorMSG(err.response?.data?.error || 'Failed to connect to the server.');
        }
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
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
            }
        },
        onError: () => setErrorMSG('Google Login Prompt Closed.')
    });

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Paper elevation={0} sx={{ p: 5, width: '100%', borderRadius: 4 }}>
                    <Typography component="h1" variant="h4" align="center" gutterBottom color="primary.main" fontWeight="bold">
                        Create an Account
                    </Typography>
                    <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
                        Join CareHelp SG. You only need a username to participate!
                    </Typography>

                    {errorMSG && <Alert severity="error" sx={{ mb: 3 }}>{errorMSG}</Alert>}

                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <Button
                            variant="outlined"
                            startIcon={<GoogleIcon />}
                            onClick={() => loginWithGoogle()}
                            sx={{
                                color: 'text.primary',
                                borderColor: 'text.secondary',
                                px: 4,
                                py: 1.5,
                                borderRadius: 8,
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '1rem',
                                '&:hover': {
                                    backgroundColor: 'rgba(0,0,0,0.04)',
                                    borderColor: 'primary.main'
                                }
                            }}
                        >
                            Sign up with Google
                        </Button>
                    </Box>
                    <Divider sx={{ mb: 3 }}>OR</Divider>

                    <Box component="form" onSubmit={handleRegister}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="Username"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            error={isTaken}
                            helperText={
                                isTaken
                                    ? "This username is already taken. Please choose another."
                                    : (isChecking ? "Checking availability..." : "")
                            }
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
                            <strong>Optional Security:</strong> If you leave the password blank, you can log in instantly with just your username next time. If you add a password, your account will be locked and required to use it.
                        </Typography>

                        <TextField
                            margin="normal"
                            fullWidth
                            id="password"
                            label="Password (Optional)"
                            name="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            fullWidth
                            id="confirmPassword"
                            label="Confirm Password (Optional)"
                            name="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            color="primary"
                            disabled={isTaken || isChecking}
                            sx={{ mt: 4, mb: 3, borderRadius: 2 }}
                        >
                            Sign Up
                        </Button>

                        <Box textAlign="center">
                            <Link to="/login" style={{ color: '#6200ea', textDecoration: 'none', fontWeight: 600 }}>
                                Already have an account? Log In
                            </Link>
                        </Box>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Register;
