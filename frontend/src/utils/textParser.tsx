import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Link as MuiLink } from '@mui/material';
import { useDispatch } from 'react-redux';
import { setSearchQuery } from '../store/slices/uiSlice';

/**
 * Parses a raw string of text and converts @username, c/community, #hashtag mentions and URLs into interactive links.
 */
export const parseRichText = (text: string): React.ReactNode[] => {
    if (!text) return [];

    // This regex looks for:
    // 1. @username (letters, numbers, underscores)
    // 2. c/communityname (letters, numbers, underscores)
    // 3. #hashtag (letters, numbers, underscores)
    // 4. URLs starting with http or https
    // 5. Bare www. URLs (e.g. www.sgcares.org)
    const regex = /(@[a-zA-Z0-9_]+|c\/[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+|https?:\/\/[^\s]+|www\.[^\s]+)/g;

    const parts = text.split(regex);

    return parts.map((part, index) => {
        if (part.startsWith('@')) {
            const username = part.substring(1);
            return (
                <MuiLink
                    key={index}
                    component={RouterLink}
                    to={`/user/${username}`}
                    onClick={(e) => e.stopPropagation()} // Prevent bubble up if inside a clickable card
                    sx={{ color: 'primary.main', fontWeight: 'bold', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                    {part}
                </MuiLink>
            );
        } else if (part.startsWith('c/')) {
            const communityName = part.substring(2);
            return (
                <MuiLink
                    key={index}
                    component={RouterLink}
                    to={`/community/${communityName}`}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ color: '#b388ff', backgroundColor: 'rgba(98,0,234,0.1)', px: 0.5, borderRadius: 1, fontWeight: 'bold', textDecoration: 'none', '&:hover': { backgroundColor: 'rgba(98,0,234,0.3)' } }}
                >
                    {part}
                </MuiLink>
            );
        } else if (part.startsWith('#')) {
            return <HashtagLink key={index} tag={part} />;
        } else if (part.startsWith('http://') || part.startsWith('https://') || part.startsWith('www.')) {
            // Auto-prepend https:// for bare www. URLs
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
                <MuiLink
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    sx={{ color: 'secondary.main', textDecoration: 'underline' }}
                >
                    {part}
                </MuiLink>
            );
        }

        // Return standard text string for non-matching parts
        return <React.Fragment key={index}>{part}</React.Fragment>;
    });
};

// Separate component so we can use hooks (useDispatch, useNavigate)
const HashtagLink: React.FC<{ tag: string }> = ({ tag }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    return (
        <MuiLink
            component="span"
            onClick={(e) => {
                e.stopPropagation();
                dispatch(setSearchQuery(tag.substring(1)));
                navigate('/');
            }}
            sx={{
                color: '#64b5f6',
                backgroundColor: 'rgba(100,181,246,0.1)',
                px: 0.5,
                borderRadius: 1,
                fontWeight: 'bold',
                textDecoration: 'none',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'rgba(100,181,246,0.25)' }
            }}
        >
            {tag}
        </MuiLink>
    );
};

