-- Add Facebook-style reaction fields and Comment pinning support
ALTER TABLE posts ADD COLUMN dislikes integer DEFAULT 0;
ALTER TABLE posts ADD COLUMN emoji varchar(50) DEFAULT '';
ALTER TABLE posts ADD COLUMN repost_count integer DEFAULT 0;

ALTER TABLE comments ADD COLUMN is_pinned boolean DEFAULT false;
