import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip, Menu, MenuItem, Chip, TextField } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import EditIcon from '@mui/icons-material/Edit';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import RepeatIcon from '@mui/icons-material/Repeat';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import api from '../api/axiosConfig';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store/store';
import { toggleUpvote, toggleDislike, toggleRepost, toggleReaction } from '../store/slices/authSlice';
import { playPopSound } from '../utils/sound';
import { parseRichText } from '../utils/textParser';

import { useNavigate } from 'react-router-dom';

interface PostCardProps {
    id: number;
    title: string;
    content: string;
    authorName: string;
    createdAt: string;
    imageUrl?: string;
    upvotes: number;
    dislikes?: number;
    repostCount?: number;
    emoji?: string;
    communityName?: string;
    onDeleteRefresh: () => void;
    isArchived?: boolean;
    isPinned?: boolean;
    isDeletedByAdmin?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ id, title, content, authorName, createdAt, imageUrl, upvotes: initialUpvotes, dislikes: initialDislikes = 0, repostCount: initialRepostCount = 0, emoji: initialEmoji = "", communityName, onDeleteRefresh, isArchived = false, isPinned = false, isDeletedByAdmin = false }) => {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [localUpvotes, setLocalUpvotes] = useState(initialUpvotes);
    const [localDislikes, setLocalDislikes] = useState(initialDislikes);
    const [localReposts, setLocalReposts] = useState(initialRepostCount);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editTitle, setEditTitle] = useState(title);
    const [editContent, setEditContent] = useState(content);
    const [localIsPinned, setLocalIsPinned] = useState(isPinned);
    const [imageError, setImageError] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const dispatch = useDispatch();
    const { isAuthenticated, username: currentUsername, role: currentRole, upvotedPosts, dislikedPosts, repostedPosts, reactedPosts } = useSelector((state: RootState) => state.auth);

    const isOwner = currentUsername === authorName;
    const isAdmin = currentRole === 'vwo_volunteer';

    const hasUpvoted = upvotedPosts?.includes(id) || false;
    const hasDisliked = dislikedPosts?.includes(id) || false;
    const hasRepostedLocally = repostedPosts?.includes(id) || false;
    const userEmoji = reactedPosts?.[id] || initialEmoji;

    const navigate = useNavigate();

    const formattedDate = new Date(createdAt).toLocaleDateString('en-SG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const handleDelete = async () => {
        try {
            await api.delete(`/posts/${id}`);
            setDeleteOpen(false);
            onDeleteRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to delete post");
            setDeleteOpen(false);
        }
    };

    const handleEditSubmit = async () => {
        try {
            await api.put(`/posts/${id}`, { title: editTitle, content: editContent });
            setEditOpen(false);
            onDeleteRefresh();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to update post");
        }
    };

    const [pinDialogOpen, setPinDialogOpen] = useState(false);
    const [communities, setCommunities] = useState<any[]>([]);
    const [selectedCommunity, setSelectedCommunity] = useState<number | ''>('');

    const handlePin = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await api.post(`/posts/${id}/pin`);
            setLocalIsPinned(!localIsPinned);
            playPopSound();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to pin post");
        }
    };

    const handleAdminPinClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (localIsPinned) {
            // Already pinned, clicking it unpins it directly
            handlePin();
            return;
        }
        if (!isAdmin) {
            // Normal post owner pin toggle
            handlePin();
            return;
        }
        // Admin pinning -> open dialog to select a target community to move and pin to
        try {
            const res = await api.get('/communities');
            setCommunities(res.data);
            setPinDialogOpen(true);
        } catch (err) {
            console.error("Failed to fetch communities for pin dialog", err);
        }
    };

    const confirmAdminPin = async () => {
        try {
            // Pass the target_community_id payload for the backend to move the post
            await api.post(`/posts/${id}/pin`, { target_community_id: selectedCommunity === '' ? undefined : selectedCommunity });
            setLocalIsPinned(true); // Force to true since it's a new pin
            setPinDialogOpen(false);
            playPopSound();
            onDeleteRefresh(); // Refresh the feed to reflect the post's new community location
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to pin post");
        }
    };

    const handleUnarchive = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await api.post(`/posts/${id}/restore`);
            onDeleteRefresh(); // Reuse the refresh trigger to clear it from the Archive tab
            playPopSound();
        } catch (err: any) {
            alert(err.response?.data?.error || "Failed to unarchive post");
        }
    };

    if (isDeletedByAdmin && !isArchived) { // If it's archived, it shows up as a full card in My Archives. If it's in the feed, show the Tombstone.
        return (
            <Card
                elevation={0}
                sx={{
                    width: '100%',
                    backgroundColor: 'rgba(255,0,0,0.03)',
                    border: '1px solid rgba(255,0,0,0.1)',
                }}
            >
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="error.main" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <DeleteIcon /> [Deleted by Staff]
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This discussion violated community guidelines and was permanently removed by a CareHelp Administrator.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const handleUpvote = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) return;

        try {
            if (hasUpvoted) {
                await api.post(`/posts/${id}/unupvote`);
                setLocalUpvotes(prev => Math.max(0, prev - 1));
            } else {
                await api.post(`/posts/${id}/upvote`);
                setLocalUpvotes(prev => prev + 1);

                if (hasDisliked) {
                    await api.post(`/posts/${id}/undislike`);
                    setLocalDislikes(prev => Math.max(0, prev - 1));
                }
            }
            dispatch(toggleUpvote(id));
            playPopSound();
        } catch (err: any) {
            console.error("Failed to upvote:", err);
        }
    };

    const handleDislike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) return;

        try {
            if (hasDisliked) {
                await api.post(`/posts/${id}/undislike`);
                setLocalDislikes(prev => Math.max(0, prev - 1));
            } else {
                await api.post(`/posts/${id}/dislike`);
                setLocalDislikes(prev => prev + 1);

                if (hasUpvoted) {
                    await api.post(`/posts/${id}/unupvote`);
                    setLocalUpvotes(prev => Math.max(0, prev - 1));
                }
            }
            dispatch(toggleDislike(id));
            playPopSound();
        } catch (err: any) {
            console.error("Failed to dislike:", err);
        }
    };

    const handleRepost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isAuthenticated) return;
        try {
            if (hasRepostedLocally) {
                await api.post(`/posts/${id}/unrepost`);
                setLocalReposts(prev => prev - 1);
            } else {
                const res = await api.post(`/posts/${id}/repost`);
                if (res.data?.message === "already reposted") {
                    // Just sync the local state if the server already has it
                    if (!hasRepostedLocally) {
                        dispatch(toggleRepost(id));
                    }
                    return;
                }
                setLocalReposts(prev => prev + 1);
            }
            dispatch(toggleRepost(id));
            playPopSound();
        } catch (err: any) {
            console.error("Failed to toggle repost:", err);
        }
    };

    const handleEmojiClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!isAuthenticated) return;
        setAnchorEl(e.currentTarget);
    };

    const handleSelectEmoji = async (newEmoji: string) => {
        setAnchorEl(null);
        try {
            if (userEmoji === newEmoji) {
                // Untoggle logic
                await api.post(`/posts/${id}/react`, { emoji: "" });
                dispatch(toggleReaction({ id, emoji: newEmoji })); // slice deletes if it matches
            } else {
                // Set or switch
                await api.post(`/posts/${id}/react`, { emoji: newEmoji });
                dispatch(toggleReaction({ id, emoji: newEmoji }));
                playPopSound();
            }
        } catch (err: any) {
            console.error("Failed to react:", err);
        }
    };

    return (
        <>
            <Card
                elevation={0}
                onClick={() => navigate(`/post/${id}`)}
                sx={{
                    width: '100%',
                    cursor: 'pointer',
                    transition: '0.3s ease-in-out',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', borderColor: 'primary.main' }
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' }, gap: { xs: 2, sm: 0 }, width: '100%' }}>
                        <Box sx={{ width: { xs: '100%', sm: 'auto' }, wordBreak: 'break-word', pr: { sm: 2 } }}>
                            {localIsPinned && (
                                <Typography variant="overline" color="#B8860B" sx={{ fontWeight: 'bold', display: 'block', mb: 1, lineHeight: 1 }}>📌 Pinned Post</Typography>
                            )}
                            <Typography variant="h5" color="primary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                <VolunteerActivismIcon />
                                {title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" display="block" sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                Posted by{' '}
                                <Typography
                                    component="span"
                                    variant="subtitle2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/user/${authorName}`);
                                    }}
                                    sx={{
                                        color: 'primary.main',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                        '&:hover': { textDecoration: 'underline' }
                                    }}
                                >
                                    {authorName}
                                </Typography>
                                {' '}on {formattedDate}
                                {communityName && (
                                    <Box component="span" sx={{ backgroundColor: 'rgba(98,0,234,0.3)', color: '#b388ff', px: 1, py: 0.2, borderRadius: 2, fontSize: '0.7rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        c/{communityName}
                                    </Box>
                                )}
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: { xs: 1, sm: 0 }, minWidth: { xs: '100%', sm: 'auto' }, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                            <Tooltip title={isAuthenticated ? (hasUpvoted ? "Upvoted" : "Upvote") : "Log in to upvote"}>
                                <Button
                                    size="small"
                                    onClick={handleUpvote}
                                    sx={{
                                        color: hasUpvoted ? 'primary.main' : 'text.secondary',
                                        minWidth: 'auto',
                                        borderRadius: 2
                                    }}
                                    startIcon={<KeyboardArrowUpIcon />}
                                >
                                    {localUpvotes}
                                </Button>
                            </Tooltip>

                            <Tooltip title={isAuthenticated ? (hasDisliked ? "Disliked" : "Dislike") : "Log in to dislike"}>
                                <Button
                                    size="small"
                                    onClick={handleDislike}
                                    sx={{
                                        color: hasDisliked ? 'error.main' : 'text.secondary',
                                        minWidth: 'auto',
                                        borderRadius: 2
                                    }}
                                    startIcon={<ThumbDownOffAltIcon />}
                                >
                                    {localDislikes}
                                </Button>
                            </Tooltip>

                            <Tooltip title={isAuthenticated ? (hasRepostedLocally ? "Undo Repost" : "Repost") : "Log in to repost"}>
                                <Button
                                    size="small"
                                    onClick={handleRepost}
                                    sx={{
                                        color: localReposts > 0 ? 'success.main' : 'text.secondary',
                                        minWidth: 'auto',
                                        borderRadius: 2
                                    }}
                                    startIcon={<RepeatIcon />}
                                >
                                    {localReposts}
                                </Button>
                            </Tooltip>

                            <Tooltip title={isAuthenticated ? "React" : "Log in to react"}>
                                <Button
                                    size="small"
                                    onClick={handleEmojiClick}
                                    sx={{
                                        color: userEmoji ? 'warning.main' : 'text.secondary',
                                        minWidth: 'auto',
                                        borderRadius: 2
                                    }}
                                    startIcon={<SentimentSatisfiedAltIcon />}
                                >
                                    {userEmoji || "React"}
                                </Button>
                            </Tooltip>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={(e: React.MouseEvent) => { e.stopPropagation(); setAnchorEl(null); }}
                            >
                                {['🔥', '❤️', '😂', '😢', '🙏', '👏'].map((emojiOpt) => (
                                    <MenuItem
                                        key={emojiOpt}
                                        onClick={(e) => { e.stopPropagation(); handleSelectEmoji(emojiOpt); }}
                                    >
                                        <Typography variant="h6">{emojiOpt}</Typography>
                                    </MenuItem>
                                ))}
                            </Menu>

                            <Tooltip title="View Comments">
                                <IconButton color="primary" size="small" onClick={(e) => { e.stopPropagation(); navigate(`/post/${id}`); }} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                    <ChatBubbleOutlineIcon />
                                </IconButton>
                            </Tooltip>
                            {isAuthenticated && (
                                <>
                                    {(isOwner || isAdmin) && (
                                        <Tooltip title={localIsPinned ? "Unpin Post" : (isAdmin ? "Pin to Community (Admin)" : "Pin Post")}>
                                            <IconButton color="secondary" size="small" onClick={handleAdminPinClick} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                                {localIsPinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {isOwner && (
                                        <Tooltip title="Edit Post">
                                            <IconButton color="info" size="small" onClick={(e) => { e.stopPropagation(); setEditOpen(true); }} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {isOwner && isArchived && !isDeletedByAdmin && (
                                        <Tooltip title="Unarchive Post">
                                            <IconButton color="success" size="small" onClick={handleUnarchive} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                                <UnarchiveIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {isOwner && !isArchived && (
                                        <Tooltip title="Archive Post">
                                            <IconButton color="warning" size="small" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                                <ArchiveIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {(!isArchived && (isOwner || isAdmin)) && (
                                        <Tooltip title={isOwner ? "Delete Post" : "Delete Post Forever"}>
                                            <IconButton color="error" size="small" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </>
                            )}
                        </Box>
                    </Box>

                    {isArchived && (
                        <Chip
                            label="Archived Post"
                            size="small"
                            color="default"
                            sx={{ mb: 2, borderRadius: 1, backgroundColor: 'action.hover', color: 'text.primary', ml: localReposts > 0 ? 1 : 0 }}
                        />
                    )}

                    <Box sx={{ position: 'relative' }}>
                        <Typography
                            variant="body1"
                            sx={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.8,
                                mb: 2,
                                ...(!isExpanded && content.length > 400 && {
                                    display: '-webkit-box',
                                    WebkitLineClamp: 4,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                })
                            }}
                        >
                            {parseRichText(content)}
                        </Typography>
                        {content.length > 400 && (
                            <Typography
                                variant="body2"
                                color="primary.main"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                sx={{
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'inline-block',
                                    mb: 2,
                                    '&:hover': { textDecoration: 'underline' }
                                }}
                            >
                                {isExpanded ? 'See Less' : 'See More'}
                            </Typography>
                        )}
                    </Box>

                    {imageUrl && (
                        <Box sx={{ mt: 2, borderRadius: 3, overflow: 'hidden', maxHeight: 400, display: 'flex', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                            {(imageUrl.toLowerCase().endsWith('.mp4') || imageUrl.toLowerCase().endsWith('.webm') || imageUrl.toLowerCase().endsWith('.mov')) ? (
                                <video src={imageUrl.startsWith('http') ? imageUrl.replace('http://localhost:8080', 'https://carehelp-api.onrender.com') : `https://carehelp-api.onrender.com${imageUrl}`} controls style={{ maxWidth: '100%', maxHeight: 400, backgroundColor: 'black' }} />
                            ) : imageError ? (
                                <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Image unavailable</Typography>
                                    <Typography variant="caption">(Storage Reset)</Typography>
                                </Box>
                            ) : (
                                <img
                                    src={imageUrl.startsWith('http') ? imageUrl.replace('http://localhost:8080', 'https://carehelp-api.onrender.com') : `https://carehelp-api.onrender.com${imageUrl}`}
                                    alt="Attachment"
                                    style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }}
                                    onError={() => setImageError(true)}
                                />
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* DELETE CONFIRMATION MODAL */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
                <DialogTitle sx={{ color: 'secondary.main' }}>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        {isOwner ? "Are you sure you want to remove this discussion? This action will archive this post." : "Are you sure you want to permanently delete this discussion? It will be marked as deleted by Staff."}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setDeleteOpen(false)} color="inherit" sx={{ opacity: 0.7 }}>Cancel</Button>
                    <Button onClick={handleDelete} color="secondary" variant="contained">Proceed</Button>
                </DialogActions>
            </Dialog>

            {/* EDIT MODAL */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ color: 'primary.main' }}>Edit Discussion</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Title"
                        variant="outlined"
                        margin="normal"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        label="Content"
                        variant="outlined"
                        multiline
                        rows={4}
                        margin="normal"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setEditOpen(false)} color="inherit" sx={{ opacity: 0.7 }}>Cancel</Button>
                    <Button onClick={handleEditSubmit} color="primary" variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* ADMIN PIN TO COMMUNITY MODAL */}
            <Dialog open={pinDialogOpen} onClose={() => setPinDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ color: 'secondary.main' }}>Pin to Community</DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary" sx={{ mb: 2, mt: 1 }}>
                        As a verified Volunteer, you can move and pin this post to the top of a specific community channel.
                    </Typography>
                    <TextField
                        select
                        fullWidth
                        label="Target Community"
                        value={selectedCommunity}
                        onChange={(e) => setSelectedCommunity(e.target.value === '' ? '' : Number(e.target.value))}
                    >
                        {(isOwner || !isAdmin) && (
                            <MenuItem value="">Pin globally / On My Wall</MenuItem>
                        )}
                        {communities.map((community) => (
                            <MenuItem key={community.id} value={community.id}>
                                c/{community.name || "Unknown"}
                            </MenuItem>
                        ))}
                    </TextField>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setPinDialogOpen(false)} color="inherit" sx={{ opacity: 0.7 }}>Cancel</Button>
                    <Button onClick={confirmAdminPin} color="secondary" variant="contained">Confirm Pin</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default PostCard;
