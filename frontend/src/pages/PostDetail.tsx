import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Box, CircularProgress, Alert, Button, TextField, Paper, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../api/axiosConfig';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import PostCard from '../components/PostCard';
import { parseRichText } from '../utils/textParser';
import { toggleLoveComment } from '../store/slices/authSlice';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ReplyIcon from '@mui/icons-material/Reply';

interface Comment {
    ID: number;
    content: string;
    author_id: number;
    author?: { username: string };
    post_id: number;
    parent_id?: number | null;
    is_pinned: boolean;
    loves: number;
    is_deleted_by_admin?: boolean;
    CreatedAt: string;
}

interface Post {
    ID: number;
    title: string;
    content: string;
    author_id: number;
    author?: { username: string };
    is_pinned: boolean;
    image_url: string;
    upvotes: number;
    dislikes: number;
    repost_count: number;
    emoji: string;
    is_deleted_by_admin?: boolean;
    CreatedAt: string;
}

const PostDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [post, setPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState<string | null>(null);

    const { isAuthenticated, colorMode, currentUsername, currentRole, lovedComments } = useSelector((state: RootState) => ({
        isAuthenticated: state.auth.isAuthenticated,
        colorMode: state.ui.colorMode,
        currentUsername: state.auth.username,
        currentRole: state.auth.role,
        lovedComments: state.auth.lovedComments,
    }));
    const isAdmin = currentRole === 'vwo_volunteer';
    const isDark = colorMode === 'dark';
    const dispatch = useDispatch();

    const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

    const fetchData = async () => {
        try {
            const [postRes, commentsRes] = await Promise.all([
                api.get(`/posts/${id}`),
                api.get(`/posts/${id}/comments`)
            ]);
            setPost(postRes.data);
            setComments(commentsRes.data || []);
            setError(null);
        } catch (err: any) {
            setError('Thread not found or failed to load.');
        } finally {
            setLoading(false);
        }
    };

    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState('');

    const handleEditCommentStart = (commentId: number, currentText: string) => {
        setEditingCommentId(commentId);
        setEditCommentText(currentText);
    };

    const handleEditCommentSubmit = async (commentId: number) => {
        try {
            await api.put(`/comments/${commentId}`, { content: editCommentText });
            setEditingCommentId(null);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to edit comment");
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        if (!window.confirm("Are you sure you want to delete this comment?")) return;
        try {
            await api.delete(`/comments/${commentId}`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to delete comment");
        }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setCommentError(null);
        try {
            await api.post('/comments', {
                post_id: Number(id),
                content: newComment,
                parent_id: replyingTo ? replyingTo.ID : undefined,
            });
            setNewComment('');
            setReplyingTo(null);
            fetchData(); // Refresh to catch the new comment
        } catch (err: any) {
            setCommentError(err.response?.data?.error || "Could not post comment.");
        }
    };

    const handlePinComment = async (commentId: number) => {
        try {
            await api.post(`/comments/${commentId}/pin`);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Could not pin comment. You must be the Post Owner or a Volunteer.");
        }
    };

    const handleLoveComment = async (commentId: number) => {
        if (!isAuthenticated) {
            alert("Please log in to react.");
            return;
        }
        try {
            const isLoved = lovedComments?.includes(commentId);
            if (isLoved) {
                await api.post(`/comments/${commentId}/unlove`);
            } else {
                await api.post(`/comments/${commentId}/love`);
            }
            dispatch(toggleLoveComment(commentId));
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to love comment");
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress color="primary" /></Box>;

    const renderCommentNode = (comment: Comment, depth: number = 0) => {
        const isLoved = lovedComments?.includes(comment.ID);
        const children = comments.filter(c => c.parent_id === comment.ID).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned));

        return (
            <React.Fragment key={comment.ID}>
                <Paper
                    elevation={0}
                    sx={{
                        p: 3,
                        mb: 2,
                        ml: { xs: 2 * depth, md: 4 * depth }, // Indent comments to show hierarchy
                        borderLeft: `3px solid ${isDark ? '#3a3b3c' : '#ced0d4'}`,
                        borderRadius: '0 12px 12px 0',
                        border: comment.is_pinned ? '2px solid #FFD700' : 'none',
                        position: 'relative'
                    }}
                >
                    {comment.is_pinned && <Typography variant="overline" color="#B8860B" sx={{ fontWeight: 'bold', display: 'block', mb: 1, lineHeight: 1 }}>📌 Pinned Comment</Typography>}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Reply from <span style={{ color: isDark ? '#e6f1ff' : '#1a1a1a', fontWeight: 600 }}>{comment.author?.username || `User #${comment.author_id}`}</span>
                        {post && comment.author_id === post.author_id && (
                            <Typography component="span" variant="caption" sx={{ ml: 1, backgroundColor: 'primary.main', color: 'primary.contrastText', padding: '2px 6px', borderRadius: 1, fontWeight: 'bold' }}>
                                [OP]
                            </Typography>
                        )}
                        {' '}on {new Date(comment.CreatedAt).toLocaleDateString()}
                    </Typography>

                    {comment.is_deleted_by_admin ? (
                        <Box sx={{ p: 2, backgroundColor: 'rgba(255,0,0,0.05)', borderRadius: 2, mb: 2, border: '1px solid rgba(255,0,0,0.1)' }}>
                            <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>
                                [Deleted by Staff]
                            </Typography>
                        </Box>
                    ) : editingCommentId === comment.ID ? (
                        <Box sx={{ mt: 2 }}>
                            <TextField fullWidth multiline rows={2} value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} />
                            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button size="small" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                                <Button size="small" variant="contained" onClick={() => handleEditCommentSubmit(comment.ID)}>Save</Button>
                            </Box>
                        </Box>
                    ) : (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {parseRichText(comment.content)}
                        </Typography>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', mt: 2, gap: 1 }}>
                        <Button
                            size="small"
                            startIcon={isLoved ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
                            onClick={() => handleLoveComment(comment.ID)}
                            sx={{ color: isLoved ? 'error.main' : 'text.secondary', minWidth: 0, textTransform: 'none' }}
                            disabled={comment.is_deleted_by_admin}
                        >
                            {comment.loves || 0}
                        </Button>

                        {isAuthenticated && (
                            <Button
                                size="small"
                                startIcon={<ReplyIcon />}
                                onClick={() => setReplyingTo(comment)}
                                sx={{ color: 'text.secondary', textTransform: 'none' }}
                            >
                                Reply
                            </Button>
                        )}

                        {isAuthenticated && !comment.is_deleted_by_admin && (
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', flex: 1, gap: 1 }}>
                                {currentUsername === comment.author?.username && (
                                    <Button size="small" variant="text" color="info" onClick={() => handleEditCommentStart(comment.ID, comment.content)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                        Edit
                                    </Button>
                                )}
                                {(currentUsername === comment.author?.username || isAdmin) && (
                                    <Button size="small" variant="text" color="error" onClick={() => handleDeleteComment(comment.ID)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                        Delete
                                    </Button>
                                )}
                                {(isAdmin || (post && currentUsername === post.author?.username)) && (
                                    <Button size="small" variant="text" color="warning" onClick={() => handlePinComment(comment.ID)} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
                                        {comment.is_pinned ? "Unpin" : "Pin"}
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Box>
                </Paper>

                {children.map(child => renderCommentNode(child, depth + 1))}
            </React.Fragment>
        );
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress color="primary" /></Box>;

    return (
        <Container maxWidth="md">
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                sx={{ mb: 3, color: 'text.secondary' }}
            >
                Back to Board
            </Button>

            {error ? (
                <Alert severity="error">{error}</Alert>
            ) : post ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Main Thread Post */}
                    <PostCard
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
                        authorName={post.author?.username || `User #${post.author_id}`}
                        onDeleteRefresh={() => navigate('/')}
                        isDeletedByAdmin={post.is_deleted_by_admin}
                    />

                    <Divider sx={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

                    {/* Comments Section */}
                    <Box>
                        <Typography variant="h5" color="primary" sx={{ mb: 3 }}>
                            Discussion ({comments.length})
                        </Typography>

                        {isAuthenticated ? (
                            <Box sx={{ mb: 4 }}>
                                {replyingTo && (
                                    <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: isDark ? '#3a3b3c' : '#f0f2f5', p: 1, borderRadius: 2 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                            Replying to {replyingTo.author?.username || `User #${replyingTo.author_id}`}
                                        </Typography>
                                        <Button size="small" color="inherit" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                    </Box>
                                )}
                                {commentError && <Alert severity="error" sx={{ mb: 2 }}>{commentError}</Alert>}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        maxRows={4}
                                        variant="outlined"
                                        size="small"
                                        placeholder={replyingTo ? "Write a reply..." : "Write a comment..."}
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 6,
                                                backgroundColor: isDark ? '#3a3b3c' : '#f0f2f5',
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="text"
                                        color="primary"
                                        onClick={handlePostComment}
                                        disabled={!newComment.trim()}
                                        sx={{ fontWeight: 'bold' }}
                                    >
                                        Post
                                    </Button>
                                </Box>
                            </Box>
                        ) : (
                            <Alert severity="info" sx={{ mb: 4 }}>Log in to join the conversation.</Alert>
                        )}

                        {/* Render Comments */}
                        {comments.filter(c => !c.parent_id).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned)).map(rootComment =>
                            renderCommentNode(rootComment, 0)
                        )}
                    </Box>
                </Box>
            ) : null}
        </Container>
    );
};

export default PostDetail;
