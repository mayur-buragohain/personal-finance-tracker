-- Full database reset for Personal Finance Tracker
-- Run this FIRST, then 001_initial_schema.sql, then 002_admin_functions.sql
-- WARNING: Deletes all profiles, expenses, categories, tags, and admin functions.

-- Admin functions (all known signatures)
DROP FUNCTION IF EXISTS admin_delete_tag(text, uuid);
DROP FUNCTION IF EXISTS admin_update_tag_label(text, uuid, text);
DROP FUNCTION IF EXISTS admin_create_tag(text, uuid, text);
DROP FUNCTION IF EXISTS admin_get_tags(text, uuid);
DROP FUNCTION IF EXISTS admin_update_category_label(text, uuid, text);
DROP FUNCTION IF EXISTS admin_get_categories(text);
DROP FUNCTION IF EXISTS admin_delete_profile(text, uuid);
DROP FUNCTION IF EXISTS admin_create_profile(text, text, text, text);
DROP FUNCTION IF EXISTS admin_create_profile(text, uuid, text, text, text);
DROP FUNCTION IF EXISTS admin_get_profiles(text);
DROP FUNCTION IF EXISTS verify_admin_password(text);

-- Tables (order respects foreign keys)
DROP TABLE IF EXISTS expense_tags CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
