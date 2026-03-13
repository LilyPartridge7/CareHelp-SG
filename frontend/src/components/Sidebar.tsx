import React, { useState, useEffect } from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Box, Divider, IconButton, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { setSidebarOpen, setSearchQuery } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import api from '../api/axiosConfig';
import { fetchCommunities } from '../store/slices/communitySlice';
import CloseIcon from '@mui/icons-material/Close';
import TagIcon from '@mui/icons-material/Tag';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';

interface Community {
    id: number;
    name: string;
    description: string;
}

const Sidebar: React.FC = () => {
    const dispatch = useDispatch<any>();
    const navigate = useNavigate();
    const { sidebarOpen, colorMode } = useSelector((state: RootState) => state.ui);
    const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);
    const { allCommunities, myCommunities, loading } = useSelector((state: RootState) => state.community);
    const isAdmin = role === 'vwo_volunteer';

    // Create Community Modal State
    const [createOpen, setCreateOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Edit Modal State
    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Delete Modal State
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
        if (
            event.type === 'keydown' &&
            ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
        ) {
            return;
        }
        dispatch(setSidebarOpen(open));
    };

    useEffect(() => {
        if (sidebarOpen) {
            dispatch(fetchCommunities(isAuthenticated));
        }
    }, [sidebarOpen, isAuthenticated, dispatch]);

    const handleJoin = async (id: number) => {
        try {
            await api.post(`/communities/${id}/join`);
            dispatch(fetchCommunities(isAuthenticated)); // Refresh lists
        } catch (err) {
            alert("Please log in to join communities.");
        }
    };

    const handleCreateCommunity = async () => {
        if (!newName.trim()) return;
        setCreateError(null);
        setIsCreating(true);

        try {
            await api.post('/communities', {
                name: newName,
                description: newDesc
            });
            setCreateOpen(false);
            setNewName('');
            setNewDesc('');
            dispatch(fetchCommunities(isAuthenticated));
        } catch (err: any) {
            setCreateError(err.response?.data?.error || "Failed to create community.");
        } finally {
            setIsCreating(false);
        }
    };

    const openEditModal = (c: Community) => {
        setEditError(null);
        setEditId(c.id);
        setEditName(c.name);
        setEditDesc(c.description);
        setEditOpen(true);
    };

    const handleEditCommunity = async () => {
        if (!editName.trim() || !editId) return;
        setEditError(null);
        setIsEditing(true);
        try {
            await api.put(`/communities/${editId}`, { name: editName, description: editDesc });
            setEditOpen(false);
            dispatch(fetchCommunities(isAuthenticated));
        } catch (err: any) {
            setEditError(err.response?.data?.error || "Failed to edit.");
        } finally {
            setIsEditing(false);
        }
    };

    const openDeleteModal = (id: number) => {
        setDeleteError(null);
        setDeleteId(id);
        setDeleteOpen(true);
    };

    const handleDeleteCommunity = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/communities/${deleteId}`);
            setDeleteOpen(false);
            dispatch(fetchCommunities(isAuthenticated));
        } catch (err: any) {
            setDeleteError(err.response?.data?.error || "Failed to delete.");
        }
    };

    const handleCommunityClick = (name: string) => {
        // Redux Search Query update instantly auto-filters the Home feed!
        dispatch(setSearchQuery(name));
        dispatch(setSidebarOpen(false));
        navigate('/'); // Escapes out of Profile or Detail pages back to Home Feed
    };

    const isDark = colorMode === 'dark';

    // Calculate which communities the user hasn't joined yet
    const myCommunityIds = new Set(myCommunities.map(c => c.id));
    const discoverCommunities = allCommunities.filter(c => !myCommunityIds.has(c.id));

    return (
        <Drawer
            anchor="left"
            open={sidebarOpen}
            onClose={toggleDrawer(false)}
            PaperProps={{
                sx: {
                    width: 280,
                    backgroundColor: isDark ? 'rgba(10, 25, 47, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(16px)',
                    borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                    color: isDark ? '#e6f1ff' : '#1a1a1a',
                }
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" fontWeight="bold" color={isDark ? 'primary.main' : 'primary.dark'}>
                    Explore CareHelp
                </Typography>
                <IconButton onClick={toggleDrawer(false)} sx={{ color: 'inherit' }}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

            <Box sx={{ width: 280, height: '100%', overflowY: 'auto' }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
                ) : (
                    <>
                        {/* PROFILE LINK */}
                        {isAuthenticated && (
                            <List sx={{ pt: 1, pb: 0 }}>
                                <ListItem disablePadding>
                                    <ListItemButton onClick={() => { dispatch(setSidebarOpen(false)); navigate('/profile'); }} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)' } }}>
                                        <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}><AccountCircleIcon /></ListItemIcon>
                                        <ListItemText primary="My Profile" primaryTypographyProps={{ fontWeight: 600 }} />
                                    </ListItemButton>
                                </ListItem>
                            </List>
                        )}
                        {isAuthenticated && <Divider sx={{ my: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />}

                        {/* MY SUBSCRIPTIONS */}
                        {isAuthenticated && myCommunities.length > 0 && (
                            <List subheader={<Typography variant="overline" sx={{ px: 3, color: 'text.secondary' }}>My Subscriptions</Typography>}>
                                {myCommunities.map((c) => (
                                    <ListItem key={c.id} disablePadding sx={{ mb: 1 }}>
                                        <ListItemButton onClick={() => handleCommunityClick(c.name)} sx={{ borderRadius: '0 24px 24px 0', mr: 2, '&:hover': { backgroundColor: isDark ? 'rgba(179, 136, 255, 0.1)' : 'rgba(98, 0, 234, 0.1)' } }}>
                                            <ListItemIcon sx={{ color: isDark ? 'primary.main' : 'primary.dark', minWidth: 40 }}><TagIcon /></ListItemIcon>
                                            <ListItemText primary={c.name} primaryTypographyProps={{ fontWeight: 600 }} />
                                        </ListItemButton>
                                        {isAdmin && (
                                            <Box sx={{ display: 'flex', position: 'absolute', right: 8 }}>
                                                <IconButton size="small" onClick={() => openEditModal(c)}><EditIcon fontSize="small" /></IconButton>
                                                <IconButton size="small" color="error" onClick={() => openDeleteModal(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                                            </Box>
                                        )}
                                    </ListItem>
                                ))}
                            </List>
                        )}
                        {isAuthenticated && myCommunities.length > 0 && <Divider sx={{ my: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />}

                        {/* DISCOVER */}
                        <List subheader={<Typography variant="overline" sx={{ px: 3, color: 'text.secondary' }}>Discover Communities</Typography>}>
                            {discoverCommunities.map((c) => (
                                <ListItem key={c.id} disablePadding sx={{ mb: 1, pr: 2 }}>
                                    <ListItemButton onClick={() => handleCommunityClick(c.name)} sx={{ borderRadius: '0 24px 24px 0', '&:hover': { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' } }}>
                                        <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}><TagIcon /></ListItemIcon>
                                        <ListItemText primary={c.name} primaryTypographyProps={{ fontWeight: 500 }} secondary={c.description} secondaryTypographyProps={{ noWrap: true, sx: { maxWidth: 120 } }} />
                                    </ListItemButton>
                                    <Button size="small" variant="outlined" sx={{ borderRadius: 6, textTransform: 'none', ml: 1, minWidth: 60 }} onClick={() => handleJoin(c.id)}>
                                        Join
                                    </Button>
                                    {isAdmin && (
                                        <Box sx={{ display: 'flex', ml: 1 }}>
                                            <IconButton size="small" onClick={() => openEditModal(c)}><EditIcon fontSize="small" /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => openDeleteModal(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                                        </Box>
                                    )}
                                </ListItem>
                            ))}
                        </List>

                        {/* CREATE BUTTON */}
                        {isAuthenticated && (
                            <Box sx={{ p: 2, mt: 2, borderTop: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)' }}>
                                <Button fullWidth variant="outlined" color="primary" onClick={() => setCreateOpen(true)} sx={{ borderRadius: 6, textTransform: 'none', fontWeight: 'bold' }}>
                                    + Create Custom Community
                                </Button>
                            </Box>
                        )}

                        {/* LOGOUT BUTTON (visible for mobile users) */}
                        {isAuthenticated && (
                            <Box sx={{ p: 2, pt: 0 }}>
                                <Button
                                    fullWidth
                                    variant="text"
                                    color="error"
                                    startIcon={<LogoutIcon />}
                                    onClick={() => {
                                        dispatch(logout());
                                        dispatch(setSidebarOpen(false));
                                        navigate('/login');
                                    }}
                                    sx={{ borderRadius: 6, textTransform: 'none', fontWeight: 'bold', mt: 1 }}
                                >
                                    Log Out
                                </Button>
                            </Box>
                        )}
                    </>
                )}
            </Box>

            {/* CREATE COMMUNITY MODAL */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ color: 'primary.main', fontSize: '1.25rem', pb: 1 }}>Originate a Community</DialogTitle>
                <DialogContent>
                    {createError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{createError}</Alert>}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Create a dedicated space for specific discussions. Anyone can join!
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Community Name (e.g. ElderlyCare)"
                        fullWidth
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                    />
                    <TextField
                        margin="dense"
                        label="Short Description"
                        fullWidth
                        multiline
                        rows={2}
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setCreateOpen(false)} color="inherit" disabled={isCreating}>Cancel</Button>
                    <Button onClick={handleCreateCommunity} variant="contained" color="primary" disabled={isCreating}>
                        {isCreating ? <CircularProgress size={24} color="inherit" /> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* EDIT COMMUNITY MODAL */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ color: 'primary.main', fontSize: '1.25rem', pb: 1 }}>Edit Topic</DialogTitle>
                <DialogContent>
                    {editError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{editError}</Alert>}
                    <TextField
                        autoFocus margin="dense" label="Topic Name" fullWidth required
                        value={editName} onChange={(e) => setEditName(e.target.value)}
                    />
                    <TextField
                        margin="dense" label="Short Description" fullWidth multiline rows={2}
                        value={editDesc} onChange={(e) => setEditDesc(e.target.value)} sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setEditOpen(false)} color="inherit" disabled={isEditing}>Cancel</Button>
                    <Button onClick={handleEditCommunity} variant="contained" color="primary" disabled={isEditing}>
                        {isEditing ? <CircularProgress size={24} color="inherit" /> : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DELETE COMMUNITY MODAL */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ color: 'error.main', fontSize: '1.25rem', pb: 1 }}>Delete Topic</DialogTitle>
                <DialogContent>
                    {deleteError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{deleteError}</Alert>}
                    <Typography>Are you sure you want to permanently delete this topic? This action cannot be undone.</Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setDeleteOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleDeleteCommunity} variant="contained" color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Drawer>
    );
};

export default Sidebar;
