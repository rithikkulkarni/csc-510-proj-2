-- ================================================
-- Supabase Database Setup
-- Tables: sessions, users, restaurants, votes
-- ================================================

-- ------------------------
-- 1. Sessions Table
-- ------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(4) UNIQUE NOT NULL,
    status TEXT DEFAULT 'open', -- 'open' or 'closed'
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT code_format_check CHECK (char_length(code) = 4 AND code = upper(code))
);

-- Trigger function to auto-uppercase codes
CREATE OR REPLACE FUNCTION uppercase_code()
RETURNS TRIGGER AS $$
BEGIN
    NEW.code := upper(NEW.code);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run before insert or update
CREATE TRIGGER trigger_uppercase_code
BEFORE INSERT OR UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION uppercase_code();

-- ------------------------
-- 2. Users Table
-- ------------------------
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    session_id BIGINT REFERENCES sessions(id)
);

-- ------------------------
-- 3. Restaurants Table
-- ------------------------
CREATE TABLE IF NOT EXISTS restaurants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    cuisine TEXT,
    dietary_tags TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    price_level INTEGER
);

-- ------------------------
-- 4. Votes Table
-- ------------------------
CREATE TABLE IF NOT EXISTS votes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    session_id BIGINT REFERENCES sessions(id),
    restaurant_id BIGINT REFERENCES restaurants(id),
    created_at TIMESTAMP DEFAULT NOW()
);
