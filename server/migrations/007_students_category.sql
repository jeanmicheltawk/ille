-- Reserved home-page category: Students' catalogue (admin toggles via published).
INSERT INTO model_categories (id, name, "sortOrder", published)
VALUES ('students', 'Students'' catalogue', 50, true)
ON CONFLICT (id) DO NOTHING;
