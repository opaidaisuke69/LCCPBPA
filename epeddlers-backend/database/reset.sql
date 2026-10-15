-- ============================================================================
-- ePeddlers - DEVELOPMENT reset. Drops and recreates the database.
-- WARNING: destroys all data. Development use only.
-- Run with:  mysql -u root < database/reset.sql
-- Then load schema.sql, seed.sql, seed_users.sql.
-- ============================================================================
DROP DATABASE IF EXISTS epeddlers;
CREATE DATABASE epeddlers CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
