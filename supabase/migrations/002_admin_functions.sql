-- Admin management functions
-- Run in Supabase SQL Editor after 001_initial_schema.sql

CREATE OR REPLACE FUNCTION verify_admin_password(p_password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_password = 'pass123';
$$;

CREATE OR REPLACE FUNCTION admin_get_profiles(p_password text)
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_profile(
  p_password text,
  p_auth_user_id uuid,
  p_name text,
  p_passkey_hash text,
  p_passkey_salt text
)
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_name text;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  v_name := trim(p_name);
  IF v_name = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  IF lower(v_name) = 'admin' THEN
    RAISE EXCEPTION 'This username is reserved';
  END IF;

  INSERT INTO profiles (auth_user_id, name, passkey_hash, passkey_salt)
  VALUES (p_auth_user_id, v_name, p_passkey_hash, p_passkey_salt)
  RETURNING profiles.id, profiles.name INTO v_profile_id, v_name;

  RETURN QUERY SELECT v_profile_id, v_name;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_profile(
  p_password text,
  p_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  DELETE FROM profiles WHERE id = p_profile_id;
END;
$$;

DROP FUNCTION IF EXISTS admin_get_categories(text);

CREATE OR REPLACE FUNCTION admin_get_categories(p_password text)
RETURNS TABLE (
  id uuid,
  label text,
  icon text,
  color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  RETURN QUERY
  SELECT c.id, c.label, c.icon, c.color
  FROM categories c
  ORDER BY c.label;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_category_label(
  p_password text,
  p_category_id uuid,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  v_label := trim(p_label);
  IF v_label = '' THEN
    RAISE EXCEPTION 'Category name is required';
  END IF;

  UPDATE categories SET label = v_label WHERE id = p_category_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_get_tags(
  p_password text,
  p_category_id uuid
)
RETURNS TABLE (
  id uuid,
  label text,
  category_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  RETURN QUERY
  SELECT t.id, t.label, t.category_id
  FROM tags t
  WHERE t.category_id = p_category_id
  ORDER BY t.label;
END;
$$;

CREATE OR REPLACE FUNCTION admin_create_tag(
  p_password text,
  p_category_id uuid,
  p_label text
)
RETURNS TABLE (id uuid, label text, category_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  v_label := trim(p_label);
  IF v_label = '' THEN
    RAISE EXCEPTION 'Tag name is required';
  END IF;

  RETURN QUERY
  INSERT INTO tags (category_id, label)
  VALUES (p_category_id, v_label)
  RETURNING tags.id, tags.label, tags.category_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_tag_label(
  p_password text,
  p_tag_id uuid,
  p_label text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  v_label := trim(p_label);
  IF v_label = '' THEN
    RAISE EXCEPTION 'Tag name is required';
  END IF;

  UPDATE tags SET label = v_label WHERE id = p_tag_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_delete_tag(
  p_password text,
  p_tag_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT verify_admin_password(p_password) THEN
    RAISE EXCEPTION 'Invalid admin credentials';
  END IF;

  DELETE FROM tags WHERE id = p_tag_id;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_admin_password(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_profiles(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_profile(text, uuid, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_profile(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_categories(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_category_label(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_tags(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_create_tag(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_tag_label(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_tag(text, uuid) TO anon, authenticated;
