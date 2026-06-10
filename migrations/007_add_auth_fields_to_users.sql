-- UP MIGRATION

-- Add name fields and verification/reset fields to users table
-- We use ALTER TABLE IF EXISTS to be safe if the table doesn't exist yet in some environments
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'users'
    ) THEN

        ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

        -- Automatically mark existing users as verified
        UPDATE users
        SET is_verified = TRUE
        WHERE is_verified IS FALSE
           OR is_verified IS NULL;

    END IF;
END $$;

-- DOWN MIGRATION
-- ALTER TABLE users DROP COLUMN IF EXISTS first_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS last_name;
-- ALTER TABLE users DROP COLUMN IF EXISTS is_verified;
-- ALTER TABLE users DROP COLUMN IF EXISTS verification_token;
-- ALTER TABLE users DROP COLUMN IF EXISTS reset_token;
-- ALTER TABLE users DROP COLUMN IF EXISTS reset_token_expires;
