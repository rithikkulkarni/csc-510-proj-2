/**
 * Sample Data for Project Handoff (Sequential IDs & 4-Letter Session Codes)
 *
 * Purpose:
 * - Demonstrates workflows for sessions, users, restaurants, and votes.
 * - One group session and one solo session.
 * - All IDs are sequential for clarity.
 * - Session codes conform to 4-letter uppercase requirement.
 * - User names are descriptive for easy understanding.
 *
 * Notes:
 * - Run after the main schema replication script.
 * - Preserves actual restaurant info.
 */

-- =========================
-- Sessions
-- =========================

-- Group session: multiple users and votes
INSERT INTO public.sessions (
    id, code, status, created_at, ends_at, latitude, longitude, radius,
    price_range, expiry_hours, mode
) VALUES
    (1, 'GRP1', 'open', '2025-11-06 01:51:31', '2025-11-06 06:51:31', 35.7797, -78.6441, 2, 1, 5, 'group');

-- Solo session: single user and vote
INSERT INTO public.sessions (
    id, code, status, created_at, ends_at, latitude, longitude, radius,
    price_range, expiry_hours, mode
) VALUES
    (2, 'SOL1', 'open', '2025-10-31 17:41:57', NULL, 38.8654, -77.039, 1, NULL, NULL, 'solo');

-- =========================
-- Users
-- =========================

-- Users in group session
INSERT INTO public.users (id, name, session_id) VALUES
    (1, 'Alice', 1),
    (2, 'Bob', 1);

-- User in solo session
INSERT INTO public.users (id, name, session_id) VALUES
    (3, 'Charlie', 2);

-- =========================
-- Restaurants
-- =========================

-- Restaurants in group session
INSERT INTO public.restaurants (
    id, name, session_id, cuisine, dietary_tags, latitude, longitude,
    price_level, google_place_id, address, rating, total_ratings, photo_url, website, delivery_links, maps_uri
) VALUES
    (1, 'The Raleigh Times', 1, NULL, NULL, 35.7780493, -78.6386322, 1, 'ChIJrwtl821frIkRuLN_Pr0pfus',
     '14 E Hargett St, Raleigh, NC 27601, USA', 4.4, NULL, NULL, NULL, '{}',
     'https://maps.google.com/?cid=16969046338752721848&g_mp=Cilnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaE5lYXJieRACGAEgAA'),
    (2, 'Gravy', 1, NULL, NULL, 35.778507, -78.638019, 1, 'ChIJa5y7kW1frIkRgWCYL18Phvo',
     '135 S Wilmington St, Raleigh, NC 27601, USA', 4.3, NULL, NULL, NULL, '{}',
     'https://maps.google.com/?cid=18052133057856036993&g_mp=Cilnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaE5lYXJieRACGAEgAA');

-- Restaurant in solo session
INSERT INTO public.restaurants (
    id, name, session_id, cuisine, dietary_tags, latitude, longitude,
    price_level, google_place_id, address, rating, total_ratings, photo_url, website, delivery_links, maps_uri
) VALUES
    (3, 'McDonald''s', 2, NULL, NULL, 38.8632632, -77.0608809, 0, 'ChIJ1afWyd62t4kR-07QTdByWog',
     'Fashion Centre Mall, 1100 S Hayes St, Arlington, VA 22202, USA', 3.6, NULL, NULL,
     'https://www.mcdonalds.com/us/en-us/location/VA/ARLINGTON/1100-S-HAYES-ST/20659.html?cid=RF:YXT:GMB::Clicks', '{}', NULL);

-- =========================
-- Votes
-- =========================

-- Votes in group session
INSERT INTO public.votes (id, session_id, user_id, restaurant_id, created_at) VALUES
    (1, 1, 1, 1, '2025-11-06 02:29:23'),  -- Alice votes for The Raleigh Times
    (2, 1, 2, 2, '2025-11-06 02:12:18');  -- Bob votes for Gravy

-- Vote in solo session
INSERT INTO public.votes (id, session_id, user_id, restaurant_id, created_at) VALUES
    (3, 2, 3, 3, '2025-10-31 17:44:22');  -- Charlie votes for McDonald's
