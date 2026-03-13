import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, InputBase, Badge, Menu, MenuItem, Divider } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { logout } from '../store/slices/authSlice';
import { toggleTheme, toggleSidebar, setSearchQuery } from '../store/slices/uiSlice';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import api from '../api/axiosConfig';

interface Notification {
    id: number;
    type: string;
    message: string;
    link: string;
    is_read: boolean;
    created_at: string;
}

const Navbar: React.FC = () => {
    const { isAuthenticated, username } = useSelector((state: RootState) => state.auth);
    const { colorMode, searchQuery } = useSelector((state: RootState) => state.ui);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [anchorElNotif, setAnchorElNotif] = useState<null | HTMLElement>(null);

    const fetchNotifications = async () => {
        if (!isAuthenticated) return;
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data || []);
        } catch (err) {
            console.error("Failed to fetch notifications:", err);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Option to poll every 30s
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const handleNotifClick = (e: React.MouseEvent<HTMLElement>) => {
        setAnchorElNotif(e.currentTarget);
    };

    const handleNotifClose = () => {
        setAnchorElNotif(null);
    };

    const handleReadNotification = async (notif: Notification) => {
        try {
            if (!notif.is_read) {
                await api.put(`/notifications/${notif.id}/read`);
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            }
            handleNotifClose();
            navigate(notif.link);
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const handleReadAll = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            handleNotifClose();
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const isDark = colorMode === 'dark';

    return (
        <AppBar position="sticky" elevation={0} sx={{
            backgroundColor: isDark ? 'rgba(10, 25, 47, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            color: isDark ? '#fff' : '#1a1a1a',
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.05)'}`,
        }}>
            <Container maxWidth="xl">
                <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between', gap: { xs: 0.5, sm: 1 }, minHeight: { xs: 48, sm: 64 } }}>

                    {/* Left: Hamburger & Logo */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <IconButton
                            size="medium"
                            edge="start"
                            color="inherit"
                            aria-label="menu"
                            sx={{ mr: { xs: 0.5, sm: 2 } }}
                            onClick={() => dispatch(toggleSidebar())}
                        >
                            <MenuIcon />
                        </IconButton>
                        <VolunteerActivismIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, color: isDark ? 'primary.main' : 'primary.dark' }} />
                        <Typography
                            variant="h6"
                            noWrap
                            component={Link}
                            to="/"
                            onClick={() => dispatch(setSearchQuery(''))}
                            sx={{
                                mr: 2,
                                display: { xs: 'none', md: 'flex' },
                                fontWeight: 700,
                                color: 'inherit',
                                textDecoration: 'none',
                            }}
                        >
                            CareHelp SG
                        </Typography>
                    </Box>

                    {/* Center: Powerful Global Search Bar */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        borderRadius: 8,
                        px: { xs: 1, sm: 2 },
                        py: 0.5,
                        width: { xs: '120px', sm: '40%', md: '30%' },
                        minWidth: { xs: '80px', sm: '200px' },
                        flex: { xs: '1 1 auto', sm: '0 1 auto' },
                        mx: { xs: 0.5, sm: 0 },
                        transition: 'all 0.3s ease',
                        border: '2px solid transparent',
                        '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
                        '&:focus-within': {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.9)',
                            borderColor: isDark ? '#64ffda' : 'primary.main',
                            boxShadow: `0 4px 20px ${isDark ? 'rgba(100,255,218,0.2)' : 'rgba(24,118,209,0.2)'}`,
                            transform: 'scale(1.02)'
                        }
                    }}>
                        <SearchIcon sx={{ color: 'text.secondary', mr: 0.5, fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                        <InputBase
                            placeholder="Search..."
                            inputProps={{ 'aria-label': 'search' }}
                            value={searchQuery}
                            onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                            sx={{ color: 'inherit', width: '100%', fontSize: { xs: '0.8rem', sm: '1rem' } }}
                        />
                    </Box>

                    {/* Right: Theme Toggle & Auth */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
                        <IconButton onClick={() => dispatch(toggleTheme())} color="inherit" size="small">
                            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
                        </IconButton>

                        {isAuthenticated ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
                                <IconButton color="inherit" onClick={handleNotifClick} size="small">
                                    <Badge badgeContent={unreadCount} color="error">
                                        <NotificationsIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
                                    </Badge>
                                </IconButton>
                                <Menu
                                    anchorEl={anchorElNotif}
                                    open={Boolean(anchorElNotif)}
                                    onClose={handleNotifClose}
                                    PaperProps={{ style: { maxHeight: 400, width: 350, marginTop: 10 } }}
                                >
                                    <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Notifications</Typography>
                                        {unreadCount > 0 && <Button size="small" onClick={handleReadAll}>Mark all read</Button>}
                                    </Box>
                                    <Divider />
                                    {notifications.length === 0 ? (
                                        <MenuItem disabled><Typography variant="body2">No notifications yet</Typography></MenuItem>
                                    ) : (
                                        notifications.map((notif) => (
                                            <MenuItem key={notif.id} onClick={() => handleReadNotification(notif)} sx={{
                                                backgroundColor: notif.is_read ? 'transparent' : (isDark ? 'rgba(100,255,218,0.1)' : 'rgba(98,0,234,0.05)'),
                                                whiteSpace: 'normal',
                                                borderBottom: '1px solid rgba(0,0,0,0.05)',
                                            }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: notif.is_read ? 'normal' : 'bold' }}>
                                                        {notif.message}
                                                    </Typography>
                                                    <Typography variant="caption" color="primary.main">
                                                        {new Date(notif.created_at).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ))
                                    )}
                                </Menu>

                                <Typography variant="body2" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 500, color: 'text.secondary' }}>
                                    Welcome, <span style={{ color: isDark ? '#b388ff' : '#6200ea' }}>{username}</span>
                                </Typography>
                                <Button component={Link} to="/profile" variant="outlined" color="primary" size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.8125rem' }, px: { xs: 1, sm: 1.5 }, py: { xs: 0.3, sm: 0.5 }, minWidth: 'auto', whiteSpace: 'nowrap' }}>
                                    My Profile
                                </Button>
                                <Button variant="text" color="primary" onClick={handleLogout} size="small" sx={{ fontSize: { xs: '0.65rem', sm: '0.8125rem' }, px: { xs: 0.5, sm: 1 }, minWidth: 'auto', display: { xs: 'none', sm: 'inline-flex' } }}>
                                    Logout
                                </Button>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
                                <Button component={Link} to="/login" variant="outlined" color="primary" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' }, px: { xs: 1, sm: 2 }, py: { xs: 0.3, sm: 0.5 }, minWidth: 'auto' }}>
                                    Log In
                                </Button>
                                <Button component={Link} to="/register" variant="contained" color="primary" size="small" sx={{ fontSize: { xs: '0.7rem', sm: '0.8125rem' }, px: { xs: 1, sm: 2 }, py: { xs: 0.3, sm: 0.5 }, minWidth: 'auto' }}>
                                    Sign Up
                                </Button>
                            </Box>
                        )}
                    </Box>

                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Navbar;
