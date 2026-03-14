import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Button, TextField, Paper, Avatar, Divider, Chip, Tabs, Tab } from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import api from '../api/axiosConfig';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';
import { loginSuccess, logout, syncInteractions } from '../store/slices/authSlice'; // Re-use this to update token/username if needed
import PostCard from '../components/PostCard';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';


interface UserProfile {
    ID: number;
    username: string;
    email: string;
    role: string;
    profile_picture_url: string;
    organization: string;
    CreatedAt: string;
    posts?: any[];
    comments?: any[];
}

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [editMode, setEditMode] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [tabIndex, setTabIndex] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { isAuthenticated, token, repostedPosts } = useSelector((state: RootState) => state.auth);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [allPosts, setAllPosts] = useState<any[]>([]);
    const [archivedPosts, setArchivedPosts] = useState<any[]>([]);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }

        fetchProfile();
    }, [isAuthenticated, navigate]);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/users/profile');
            setProfile(res.data.profile);
            setEditEmail(res.data.profile?.email || '');

            // Sync interactions to Redux
            dispatch(syncInteractions({
                upvotedPosts: res.data.upvotedPosts,
                dislikedPosts: res.data.dislikedPosts,
                repostedPosts: res.data.repostedPosts,
                reactedPosts: res.data.reactedPosts,
                lovedComments: res.data.lovedComments
            }));

            // Fetch all posts so we can filter for user's reposted history
            const postsRes = await api.get('/posts');
            setAllPosts(postsRes.data || []);

            // Fetch archived posts
            const archivedRes = await api.get('/posts/archived');
            setArchivedPosts(archivedRes.data || []);

            setError(null);
        } catch (err: any) {
            setError('Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSuccessMsg(null);
        setError(null);
        setIsSaving(true);

        try {
            let finalizedImageUrl = profile?.profile_picture_url || "";

            // If user selected a new image, upload it first
            if (newImage) {
                const formData = new FormData();
                formData.append('image', newImage);
                const uploadRes = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                if (uploadRes.data && uploadRes.data.image_url) {
                    finalizedImageUrl = uploadRes.data.image_url;
                }
            }

            // Send Profile Update Request
            const updateRes = await api.put('/users/profile', {
                email: editEmail,
                profile_picture_url: finalizedImageUrl
            });

            setSuccessMsg('Profile updated successfully! If you submitted a VWO domain, your Staff Rank will be updated automatically.');
            setEditMode(false);
            setNewImage(null);

            // Re-auth logic - keeps redux in sync
            if (token && updateRes.data.username) {
                dispatch(loginSuccess({ token, username: updateRes.data.username, role: updateRes.data.role }));
            }

            // Re-fetch full profile to get correct picture URL and all related data
            await fetchProfile();

        } catch (err: any) {
            setError(err.response?.data?.error || "Could not save profile updates.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await api.delete('/users/profile');
            dispatch(logout());
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || "Could not delete account.");
            setDeleteDialogOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress color="primary" /></Box>;

    return (
        <Container maxWidth="md">
            <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, mt: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="h4" color="primary.main" fontWeight="bold">
                        My CareHelp Profile
                    </Typography>
                    {!editMode ? (
                        <Button variant="outlined" onClick={() => setEditMode(true)}>
                            Edit Profile
                        </Button>
                    ) : (
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button variant="text" color="inherit" onClick={() => { setEditMode(false); setNewImage(null); setEditEmail(profile?.email || ''); }} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button variant="contained" color="secondary" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                            </Button>
                        </Box>
                    )}
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                {successMsg && <Alert severity="success">{successMsg}</Alert>}

                <Divider />

                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6, alignItems: { xs: 'center', md: 'flex-start' } }}>
                    {/* Avatar Column */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Avatar
                            src={newImage ? URL.createObjectURL(newImage) : (profile?.profile_picture_url ? (profile.profile_picture_url.startsWith('http') ? profile.profile_picture_url : `${(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8080' : 'https://carehelp-api.onrender.com'}${profile.profile_picture_url}`) : undefined)}
                            sx={{ width: 150, height: 150, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        >
                            {!profile?.profile_picture_url && !newImage && <AccountCircleIcon sx={{ fontSize: 150 }} />}
                        </Avatar>

                        {editMode && (
                            <>
                                <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    ref={fileInputRef}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setNewImage(e.target.files[0]);
                                        }
                                    }}
                                />
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<PhotoCameraIcon />}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Change Picture
                                </Button>
                            </>
                        )}
                    </Box>

                    {/* Details Column */}
                    <Box sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>

                        <Box>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">Username</Typography>
                            <Typography variant="h5">{profile?.username}</Typography>
                        </Box>

                        <Box>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">Role Status</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                {profile?.role === 'vwo_volunteer' ? (
                                    <Chip
                                        icon={<VerifiedUserIcon />}
                                        label="Verified VWO Staff"
                                        color="primary"
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                ) : (
                                    <Chip label="Public User" variant="outlined" />
                                )}
                            </Box>
                            {profile?.role === 'public_user' && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                    Add an official VWO domain email (e.g. @example-vwo.org.sg) to automatically receive Staff permissions!
                                </Typography>
                            )}
                        </Box>

                        <Box>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">Link Email Address</Typography>
                            {editMode ? (
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="yourname@example-vwo.org.sg"
                                />
                            ) : (
                                <Typography variant="body1">
                                    {profile?.email && !profile.email.endsWith('@carehelp.sg') ? profile.email : 'No personal email linked.'}
                                </Typography>
                            )}
                        </Box>

                        <Box>
                            <Typography variant="overline" color="text.secondary" fontWeight="bold">Member Since</Typography>
                            <Typography variant="body2">
                                {profile ? new Date(profile.CreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                            </Typography>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                Delete Account Forever
                            </Button>
                        </Box>

                    </Box>
                </Box>

                {/* ACTIVITY TABS */}
                <Box sx={{ mt: 4 }}>
                    <Tabs value={tabIndex} onChange={(_e, val) => setTabIndex(val)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                        <Tab label={`My Discussions (${profile?.posts?.length || 0})`} />
                        <Tab label={`My Comments (${profile?.comments?.length || 0})`} />
                        <Tab label={`My Reposts (${repostedPosts?.length || 0})`} />
                        <Tab label={`My Archived Posts (${archivedPosts.length})`} />
                    </Tabs>

                    {tabIndex === 0 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {(!profile?.posts || profile.posts.length === 0) ? (
                                <Typography color="text.secondary" align="center">You haven't posted any discussions yet.</Typography>
                            ) : (
                                [...profile.posts]
                                    .sort((a, b) => {
                                        // Pinned posts always float to the top
                                        if (a.is_pinned && !b.is_pinned) return -1;
                                        if (!a.is_pinned && b.is_pinned) return 1;
                                        // Otherwise sort by newest
                                        return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime();
                                    })
                                    .map(post => (
                                        <PostCard
                                            key={post.ID}
                                            id={post.ID}
                                            title={post.title}
                                            content={post.content}
                                            createdAt={post.CreatedAt}
                                            imageUrl={post.image_url}
                                            upvotes={post.upvotes}
                                            dislikes={post.dislikes}
                                            repostCount={post.repost_count}
                                            emoji={post.emoji}
                                            isPinned={post.is_pinned}
                                            authorName={profile.username}
                                            onDeleteRefresh={fetchProfile}
                                            isDeletedByAdmin={post.is_deleted_by_admin}
                                        />
                                    ))
                            )}
                        </Box>
                    )}

                    {tabIndex === 1 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {(!profile?.comments || profile.comments.length === 0) ? (
                                <Typography color="text.secondary" align="center">You haven't left any comments yet.</Typography>
                            ) : (
                                profile.comments.map(comment => (
                                    <Paper key={comment.ID} elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <Typography variant="body2">{comment.content}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                            Commented on {new Date(comment.CreatedAt).toLocaleDateString()}
                                        </Typography>
                                    </Paper>
                                ))
                            )}
                        </Box>
                    )}

                    {tabIndex === 2 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {(!repostedPosts || repostedPosts.length === 0) ? (
                                <Typography color="text.secondary" align="center">You haven't reposted any discussions yet.</Typography>
                            ) : (
                                allPosts.filter(post => repostedPosts.includes(post.ID)).map(post => (
                                    <PostCard
                                        key={post.ID}
                                        id={post.ID}
                                        title={post.title}
                                        content={post.content}
                                        createdAt={post.CreatedAt}
                                        imageUrl={post.image_url}
                                        upvotes={post.upvotes}
                                        dislikes={post.dislikes}
                                        repostCount={post.repost_count}
                                        emoji={post.emoji}
                                        authorName={post.author?.username || 'Unknown'} // We don't have the author populated purely from allPosts if GORM isn't preloading. Wait, let's see.
                                        onDeleteRefresh={fetchProfile}
                                        isDeletedByAdmin={post.is_deleted_by_admin}
                                    />
                                ))
                            )}
                        </Box>
                    )}

                    {tabIndex === 3 && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {(!archivedPosts || archivedPosts.length === 0) ? (
                                <Typography color="text.secondary" align="center">You don't have any archived posts.</Typography>
                            ) : (
                                archivedPosts.map(post => (
                                    <PostCard
                                        key={post.ID}
                                        id={post.ID}
                                        title={post.title}
                                        content={post.content}
                                        createdAt={post.CreatedAt}
                                        imageUrl={post.image_url}
                                        upvotes={post.upvotes}
                                        dislikes={post.dislikes}
                                        repostCount={post.repost_count}
                                        emoji={post.emoji}
                                        authorName={profile?.username || 'Unknown'}
                                        onDeleteRefresh={fetchProfile}
                                        isArchived={true}
                                        isDeletedByAdmin={post.is_deleted_by_admin}
                                    />
                                ))
                            )}
                        </Box>
                    )}
                </Box>
            </Paper>

            <Dialog
                open={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
            >
                <DialogTitle sx={{ color: 'error.main' }}>{"Delete Account Permanently?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you absolutely sure you want to delete your CareHelp SG account? This action cannot be undone. All your posts, comments, history, and profile data will be permanently erased.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
                    <Button onClick={handleDeleteAccount} color="error" autoFocus disabled={isDeleting}>
                        {isDeleting ? <CircularProgress size={24} color="inherit" /> : 'Yes, Delete Everything'}
                    </Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
};

export default Profile;
