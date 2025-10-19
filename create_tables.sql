-- ================================================
-- Supabase Database Setup
-- Tables: sessions, users, restaurants, votes
-- Sample data included for restaurants
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

-- ------------------------
-- 5. Sample Restaurants
-- ------------------------
INSERT INTO restaurants (name, cuisine, dietary_tags, latitude, longitude, price_level) VALUES
('Pizza Place', 'Italian', 'vegetarian', 40.7128, -74.0060, 2),
('Sushi House', 'Japanese', 'gluten-free', 40.73061, -73.935242, 3),
('Burger Joint', 'American', 'none', 40.715, -74.015, 1),
('Taco Spot', 'Mexican', 'spicy', 40.720, -73.995, 2),
('Salad Bar', 'Healthy', 'vegan', 40.725, -74.010, 1);
