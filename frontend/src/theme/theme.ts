import { createTheme } from '@mui/material/styles';
import type { ThemeOptions } from '@mui/material/styles';

export const getTheme = (mode: 'light' | 'dark') => {
    const isDark = mode === 'dark';

    const themeOptions: ThemeOptions = {
        palette: {
            mode,
            primary: {
                main: isDark ? '#ffffff' : '#050505', // Black and White like Facebook
                contrastText: isDark ? '#000000' : '#ffffff',
            },
            secondary: {
                main: isDark ? '#ff6b6b' : '#E63946',
                contrastText: '#ffffff',
            },
            background: {
                default: isDark ? '#18191a' : '#f0f2f5', // FB-style default backgrounds
                paper: isDark ? 'rgba(36, 37, 38, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            },
            text: {
                primary: isDark ? '#e4e6eb' : '#1c1e21',
                secondary: isDark ? '#b0b3b8' : '#65676b',
            },
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h1: {
                fontSize: '2.5rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
            },
        },
        shape: {
            borderRadius: 16,
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: isDark ? '#18191a' : '#f0f2f5',
                        // Subtle animated gradient
                        background: isDark
                            ? 'linear-gradient(-45deg, #18191a, #242526, #1c1e21)'
                            : 'linear-gradient(-45deg, #f0f2f5, #e4e6eb, #ffffff)',
                        backgroundSize: '400% 400%',
                        animation: 'gradientBG 15s ease infinite',
                        minHeight: '100vh',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
                        boxShadow: isDark
                            ? '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
                            : '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: 'none',
                        fontWeight: 600,
                        borderRadius: 8,
                        padding: '10px 24px',
                        boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        },
    };

    return createTheme(themeOptions);
};
