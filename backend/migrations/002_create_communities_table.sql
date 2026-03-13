CREATE TABLE IF NOT EXISTS communities (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_communities_deleted_at ON communities(deleted_at);

-- Add Default Communities
INSERT INTO communities (name, description) VALUES ('Volunteers Hub', 'A place for volunteers to coordinate and share resources.') ON CONFLICT DO NOTHING;
INSERT INTO communities (name, description) VALUES ('General Discussion', 'General CareHelp discussions and Q&A.') ON CONFLICT DO NOTHING;
INSERT INTO communities (name, description) VALUES ('Announcements', 'Official CVWO updates.') ON CONFLICT DO NOTHING;

-- ALter the posts table to add the community linkage
ALTER TABLE posts ADD COLUMN IF NOT EXISTS community_id INTEGER NOT NULL DEFAULT 2;
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON posts(community_id);
