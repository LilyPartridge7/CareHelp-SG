import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Box, Typography, Avatar, Paper, Divider,
    CircularProgress, Alert, Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../api/axiosConfig';
import PostCard from '../components/PostCard';

interface PublicProfileData {
    id: number;
    username: string;
    role: string;
    profile_picture_url: string;
    created_at: string;
}

const PublicProfile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const navigate = useNavigate();

    const [profile, setProfile] = useState<PublicProfileData | null>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPublicData = async () => {
            setLoading(true);
            try {
                // Fetch public profile info
                const profileRes = await api.get(`/users/public/${username}`);
                setProfile(profileRes.data);

                // Fetch public posts by user
                const postsRes = await api.get(`/users/public/${username}/posts`);
                setPosts(postsRes.data || []);
            } catch (err: any) {
                setError(err.response?.data?.error || "User not found or error loading profile.");
            } finally {
                setLoading(false);
            }
        };

        if (username) {
            fetchPublicData();
        }
    }, [username]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    if (error || !profile) {
        return (
            <Container maxWidth="md" sx={{ mt: 5 }}>
                <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
                <Alert severity="error">
                    <Typography variant="h6">{error || "User not found"}</Typography>
                </Alert>
            </Container>
        );
    }

    const initials = profile.username ? profile.username.substring(0, 2).toUpperCase() : 'U';

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mb: 3 }}>
                Back to Feed
            </Button>

            {/* Profile Header */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Avatar
                    src={profile.profile_picture_url ? (profile.profile_picture_url.startsWith('http') ? profile.profile_picture_url : `${(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://localhost:8080' : 'https://carehelp-api.onrender.com'}${profile.profile_picture_url}`) : undefined}
                    sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: '2.5rem', fontWeight: 'bold' }}
                >
                    {!profile.profile_picture_url && initials}
                </Avatar>
                <Box>
                    <Typography variant="h3" fontWeight={800} gutterBottom>
                        {profile.username}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                        Role: {profile.role === 'vwo_volunteer' ? 'Verified VWO Staff' : 'Community Member'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Joined: {new Date(profile.created_at).toLocaleDateString()}
                    </Typography>
                </Box>
            </Paper>

            <Divider sx={{ mb: 4 }} />

            {/* User's Posts Feed */}
            <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                {profile.username}'s Posts
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {posts.length > 0 ? (
                    posts.sort((a, b) => {
                        if (a.is_pinned && !b.is_pinned) return -1;
                        if (!a.is_pinned && b.is_pinned) return 1;
                        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    }).map(post => (
                        <PostCard
                            key={post.ID}
                            id={post.ID}
                            title={post.title}
                            authorName={post.author?.username || 'Unknown User'}
                            content={post.content}
                            upvotes={post.upvotes}
                            dislikes={post.dislikes}
                            repostCount={post.repost_count}
                            communityName={post.community?.name || 'General'}
                            createdAt={post.CreatedAt}
                            imageUrl={post.image_url}
                            emoji={post.emoji}
                            onDeleteRefresh={() => { }}
                            isArchived={false}
                            isPinned={post.is_pinned}
                            isDeletedByAdmin={post.is_deleted_by_admin}
                        />
                    ))
                ) : (
                    <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px dashed', borderColor: 'divider', backgroundColor: 'transparent' }}>
                        <Typography color="text.secondary">{profile.username} hasn't posted anything yet.</Typography>
                    </Paper>
                )}
            </Box>
        </Container>
    );
};

export default PublicProfile;
