-- Sample restaurants
INSERT INTO restaurants (name, cuisine, dietary_tags, latitude, longitude, price_level) VALUES
('Pizza Place', 'Italian', 'vegetarian', 40.7128, -74.0060, 2),
('Sushi House', 'Japanese', 'gluten-free', 40.73061, -73.935242, 3),
('Burger Joint', 'American', 'none', 40.758896, -73.985130, 1),
('Taco Spot', 'Mexican', 'spicy', 40.741895, -73.989308, 2),
('Salad Bar', 'Healthy', 'vegan', 40.729513, -73.996461, 1);

-- sample users
INSERT INTO users (name, session_id) VALUES
('Alice', NULL),
('Bob', NULL),
('Charlie', NULL);

-- sample sessions
INSERT INTO sessions (code, status) VALUES
('ABCD1234', 'open'),
('EFGH5678', 'open');
