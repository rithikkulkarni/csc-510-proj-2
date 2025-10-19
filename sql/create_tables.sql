-- ================================================
-- Supabase Database Setup
-- Tables: sessions, users, restaurants, votes
-- ================================================

-- ------------------------
-- 1. Sessions Table
-- ------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    status TEXT DEFAULT 'open', -- 'open' or 'closed'
    created_at TIMESTAMP DEFAULT NOW()
);

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
