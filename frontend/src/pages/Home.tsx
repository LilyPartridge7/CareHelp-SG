import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, Box, CircularProgress, Alert, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Paper, Select, MenuItem, FormControl, InputLabel, Chip } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloseIcon from '@mui/icons-material/Close';
import TagIcon from '@mui/icons-material/Tag';
import api from '../api/axiosConfig';
import { useSelector, useDispatch } from 'react-redux';
import { openCreatePostModal, closeCreatePostModal } from '../store/slices/uiSlice';
import { fetchCommunities } from '../store/slices/communitySlice';
import type { RootState } from '../store/store';
import PostCard from '../components/PostCard';
import { useNavigate } from 'react-router-dom';

interface Post {
    id: number;
    title: string;
    content: string;
    author_id: number;
    author?: { username: string };
    community?: { name: string; description: string };
    image_url: string;
    upvotes: number;
    dislikes: number;
    repost_count: number;
    emoji: string;
    is_pinned: boolean;
    is_deleted_by_admin?: boolean;
    created_at: string;
}

const Home: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // New Post Modal State - Tracked globally so SpeedDial FAB can open it
    const createOpen = useSelector((state: RootState) => state.ui.createPostModalOpen);
    const dispatch = useDispatch<any>();
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newImage, setNewImage] = useState<File | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [isPosting, setIsPosting] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [sortBy, setSortBy] = useState<string>('newest');
    const [activeTag, setActiveTag] = useState<string | null>(null);
    
    // Use Centralized Community State
    const { allCommunities, isAuthenticated } = useSelector((state: RootState) => ({
        allCommunities: state.community.allCommunities,
        isAuthenticated: state.auth.isAuthenticated
    }));
    const [newCommunityId, setNewCommunityId] = useState<number>(1);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const postsRef = useRef<HTMLDivElement>(null);

    const searchQuery = useSelector((state: RootState) => state.ui.searchQuery).toLowerCase();
    const navigate = useNavigate();

    const [showHero, setShowHero] = useState<boolean>(true);

    useEffect(() => {
        setShowHero(!isAuthenticated);
    }, [isAuthenticated]);

    // Auto-scroll when search query changes if user is at the very top
    useEffect(() => {
        if (searchQuery && postsRef.current && window.scrollY < 200) {
            postsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [searchQuery]);

    const fetchPosts = async () => {
        try {
            const postsRes = await api.get('/posts');
            setPosts(postsRes.data);
            setError(null);
        } catch (err) {
            setError('Failed to load discussions.');
        } finally {
            setLoadingPosts(false);
        }
    };

    useEffect(() => {
        fetchPosts();
        dispatch(fetchCommunities(isAuthenticated));
    }, [isAuthenticated, dispatch]);

    const handleCreateSubmit = async () => {
        setCreateError(null);
        setIsPosting(true);
        try {
            let finalizedImageUrl = "";

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

            await api.post('/posts', {
                title: newTitle,
                content: newContent,
                community_id: newCommunityId,
                image_url: finalizedImageUrl
            });

            dispatch(closeCreatePostModal());
            setNewTitle('');
            setNewContent('');
            setNewImage(null);
            fetchPosts();
        } catch (err: any) {
            if (err.response && err.response.data && err.response.data.error) {
                setCreateError(err.response.data.error);
            } else {
                setCreateError("Could not create post. Are you logged in?");
            }
        } finally {
            setIsPosting(false);
        }
    };

    if (loadingPosts) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress color="primary" /></Box>;

    let filteredPosts = posts.filter(
        post => post.title.toLowerCase().includes(searchQuery) || post.content.toLowerCase().includes(searchQuery)
    );

    if (activeTag) {
        filteredPosts = filteredPosts.filter(
            post => post.community?.name === activeTag
        );
    }

    filteredPosts = [...filteredPosts].sort((a, b) => {
        // Pinned posts always come first
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;

        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sortBy === 'upvotes') return b.upvotes - a.upvotes;
        if (sortBy === 'reposts') return b.repost_count - a.repost_count;
        return 0;
    });

    const selectedCommunity = allCommunities.find(c => c.name === activeTag);

    return (
        <Container maxWidth="lg">
            {/* Hero Banner Area */}
            {showHero && (
                <Box sx={{ p: { xs: 3, sm: 5 }, mb: 4, mt: 3, borderRadius: 3, backgroundColor: 'background.paper', color: 'text.primary', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                    <Typography variant="h3" fontWeight={800} gutterBottom sx={{ color: 'primary.main', mb: 2, fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                        Welcome to CareHelp SG
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400, maxWidth: 650, margin: '0 auto', mb: 4, lineHeight: 1.6, fontSize: { xs: '0.85rem', sm: '1rem', md: '1.25rem' } }}>
                        A unified digital space for Volunteers and Beneficiaries. Join discussions, ask for help, or find new ways to contribute to the Singapore community!
                    </Typography>

                    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => navigate('/login')}
                            sx={{
                                borderRadius: 8,
                                px: 5,
                                py: 1.2,
                                fontSize: '1.05rem',
                                fontWeight: 'bold',
                                textTransform: 'none',
                                boxShadow: '0 4px 14px rgba(98, 0, 234, 0.4)'
                            }}
                        >
                            Log In / Join Now
                        </Button>
                        <Button
                            variant="outlined"
                            color="inherit"
                            size="large"
                            onClick={() => {
                                setShowHero(false);
                                setTimeout(() => postsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            }}
                            sx={{
                                borderRadius: 8,
                                px: 4,
                                py: 1.2,
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                textTransform: 'none',
                                borderColor: 'divider',
                                color: 'text.secondary'
                            }}
                        >
                            Skip to Board
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Selected Community Header */}
            {activeTag && selectedCommunity && (
                <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 4, backgroundColor: 'primary.main', color: 'primary.contrastText', position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h4" fontWeight={800} gutterBottom>
                            c/{selectedCommunity.name}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 800 }}>
                            {selectedCommunity.description || "Welcome to the community! Join the discussion and share your thoughts with others."}
                        </Typography>
                    </Box>
                    <Box sx={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, transform: 'rotate(-15deg)' }}>
                         <TagIcon sx={{ fontSize: 180 }} />
                    </Box>
                </Paper>
            )}

            <Box ref={postsRef} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2, scrollMarginTop: '100px' }}>
                <Typography variant="h3" color="primary.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem', md: '3rem' } }}>
                    {searchQuery ? `Search Results for "${searchQuery}"` : activeTag ? `Feed: c/${activeTag}` : "Community Board"}
                </Typography>
                {isAuthenticated && (
                    <Button variant="contained" color="primary" onClick={() => dispatch(openCreatePostModal())} sx={{ borderRadius: 6, fontWeight: 'bold' }}>
                        Write a Post
                    </Button>
                )}
            </Box>

            {/* Filter and Sort Controls */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4, alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {allCommunities.map(community => (
                        <Chip
                            key={community.id}
                            label={community.name}
                            clickable
                            color={activeTag === community.name ? "primary" : "default"}
                            variant={activeTag === community.name ? "filled" : "outlined"}
                            onClick={() => setActiveTag(activeTag === community.name ? null : community.name)}
                            sx={{ transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                        />
                    ))}
                </Box>
                <FormControl size="small" sx={{ minWidth: 150, backgroundColor: 'background.paper', borderRadius: 1 }}>
                    <InputLabel id="sort-select-label">Sort By</InputLabel>
                    <Select
                        labelId="sort-select-label"
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                        sx={{ borderRadius: 1 }}
                    >
                        <MenuItem value="newest">Newest First</MenuItem>
                        <MenuItem value="oldest">Oldest First</MenuItem>
                        <MenuItem value="upvotes">Most Upvotes</MenuItem>
                        <MenuItem value="reposts">Most Reposts</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {!isAuthenticated && !showHero && (
                <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, backgroundColor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid', borderColor: 'divider' }}>
                    <Box>
                        <Typography variant="h6" color="text.primary" fontWeight="bold">You are browsing as a guest</Typography>
                        <Typography variant="body2" color="text.secondary">Create a username instantly to start posting, liking, and replying to the community.</Typography>
                    </Box>
                    <Button variant="contained" color="primary" onClick={() => navigate('/login')} sx={{ borderRadius: 6, textTransform: 'none', fontWeight: 'bold' }}>
                        Join the Discussion
                    </Button>
                </Paper>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
                <Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {filteredPosts.length === 0 ? (
                            <Typography align="center" color="text.secondary">No posts found matching '{searchQuery}'.</Typography>
                        ) : (
                            filteredPosts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    id={post.id}
                                    title={post.title}
                                    content={post.content}
                                    createdAt={post.created_at}
                                    imageUrl={post.image_url}
                                    upvotes={post.upvotes}
                                    dislikes={post.dislikes}
                                    repostCount={post.repost_count}
                                    emoji={post.emoji}
                                    communityName={post.community?.name}
                                    onDeleteRefresh={fetchPosts}
                                    authorName={post.author?.username || `User #${post.author_id}`}
                                    isPinned={post.is_pinned}
                                    isDeletedByAdmin={post.is_deleted_by_admin}
                                />
                            ))
                        )}
                    </Box>
                </Box>

                <Box>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 4, position: 'sticky', top: 90, backgroundColor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="h6" color="primary.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                            🔥 Trending Discussions
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            A live summary of the most active community posts.
                        </Typography>

                        {/* Sort by upvotes for true "Trending" algorithm */}
                        {[...posts].sort((a, b) => b.upvotes - a.upvotes).slice(0, 4).map(post => (
                            <Box
                                key={post.id}
                                onClick={() => navigate(`/post/${post.id}`)}
                                sx={{
                                    mb: 2,
                                    pb: 2,
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2sease',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.08)',
                                        transform: 'translateX(4px)'
                                    },
                                    '&:last-child': { borderBottom: 'none', mb: 0 }
                                }}
                            >
                                <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                    {post.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {post.upvotes} Upvotes · {post.author?.username || `User #${post.author_id}`}
                                </Typography>
                            </Box>
                        ))}
                        {posts.length === 0 && <Typography variant="caption" color="text.secondary">No trending posts yet.</Typography>}
                    </Paper>
                </Box>
            </Box>

            {/* CREATE POST MODAL - Uses Theme's Glassmorphism Paper */}
            <Dialog open={createOpen} onClose={() => dispatch(closeCreatePostModal())} fullWidth maxWidth="sm">
                <DialogTitle sx={{ color: 'primary.main', fontSize: '1.5rem', pb: 1 }}>Write a Post</DialogTitle>
                <DialogContent>
                    {createError && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{createError}</Alert>}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Discussion Title"
                        fullWidth
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
                        <InputLabel id="community-select-label">Community</InputLabel>
                        <Select
                            labelId="community-select-label"
                            value={newCommunityId}
                            label="Community"
                            onChange={(e) => setNewCommunityId(Number(e.target.value))}
                        >
                            {allCommunities.map((c) => (
                                <MenuItem key={c.id} value={c.id}>
                                    c/{c.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense"
                        label="What's on your mind? *"
                        fullWidth
                        required
                        multiline
                        rows={4}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        sx={{ mt: 2, mb: 2 }}
                    />

                    <Box
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                setNewImage(e.dataTransfer.files[0]);
                            }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        sx={{
                            border: '2px dashed',
                            borderColor: isDragging ? 'primary.main' : 'rgba(255,255,255,0.2)',
                            padding: 4,
                            borderRadius: 3,
                            backgroundColor: isDragging ? 'rgba(98,0,234,0.1)' : 'rgba(0,0,0,0.05)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            mt: 2,
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <input
                            type="file"
                            accept="image/*,video/*"
                            style={{ display: 'none' }}
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    setNewImage(e.target.files[0]);
                                }
                            }}
                        />
                        {!newImage ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <CloudUploadIcon sx={{ fontSize: 48, color: isDragging ? 'primary.main' : 'text.secondary', mb: 1 }} />
                                <Typography variant="body1" color={isDragging ? 'primary.main' : 'text.primary'} fontWeight="bold">
                                    {isDragging ? "Drop your media here!" : "Click or drag media here to attach"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Supports photos and videos · On mobile, you can take a photo directly
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                                <Typography variant="h6" color="primary.main" fontWeight="bold">Attached: {newImage.name}</Typography>
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setNewImage(null); }}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
                    <Button onClick={() => dispatch(closeCreatePostModal())} color="inherit" sx={{ opacity: 0.7 }} disabled={isPosting}>Cancel</Button>
                    <Button onClick={handleCreateSubmit} variant="contained" color="primary" disabled={isPosting}>
                        {isPosting ? <CircularProgress size={24} color="inherit" /> : 'Post Discussion'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Home;
