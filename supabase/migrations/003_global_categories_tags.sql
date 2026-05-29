-- Make categories and tags global (shared across all users)
-- Run in Supabase SQL Editor after 002_admin_functions.sql

-- ---------------------------------------------------------------------------
-- 1. Merge duplicate categories (same label) into one canonical row per label
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE category_id_map AS
WITH canonical AS (
  SELECT DISTINCT ON (lower(trim(label)))
    id AS canonical_id,
    lower(trim(label)) AS norm_label
  FROM categories
  ORDER BY lower(trim(label)), created_at ASC
)
SELECT c.id AS old_id, cn.canonical_id AS new_id
FROM categories c
JOIN canonical cn ON lower(trim(c.label)) = cn.norm_label;

UPDATE expenses e
SET category_id = m.new_id
FROM category_id_map m
WHERE e.category_id = m.old_id
  AND m.old_id <> m.new_id;

UPDATE tags t
SET category_id = m.new_id
FROM category_id_map m
WHERE t.category_id = m.old_id
  AND m.old_id <> m.new_id;

DELETE FROM categories c
USING category_id_map m
WHERE c.id = m.old_id
  AND m.old_id <> m.new_id;

-- ---------------------------------------------------------------------------
-- 2. Merge duplicate tags (same category + label)
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE tag_id_map AS
WITH canonical AS (
  SELECT DISTINCT ON (category_id, lower(trim(label)))
    id AS canonical_id,
    category_id,
    lower(trim(label)) AS norm_label
  FROM tags
  ORDER BY category_id, lower(trim(label)), created_at ASC
)
SELECT t.id AS old_id, cn.canonical_id AS new_id
FROM tags t
JOIN canonical cn
  ON t.category_id = cn.category_id
 AND lower(trim(t.label)) = cn.norm_label;

DELETE FROM expense_tags et
USING tag_id_map m
WHERE et.tag_id = m.old_id
  AND m.old_id <> m.new_id
  AND EXISTS (
    SELECT 1 FROM expense_tags dup
    WHERE dup.expense_id = et.expense_id
      AND dup.tag_id = m.new_id
  );

UPDATE expense_tags et
SET tag_id = m.new_id
FROM tag_id_map m
WHERE et.tag_id = m.old_id
  AND m.old_id <> m.new_id;

DELETE FROM tags t
USING tag_id_map m
WHERE t.id = m.old_id
  AND m.old_id <> m.new_id;

-- ---------------------------------------------------------------------------
-- 3. Drop profile scoping from categories
-- ---------------------------------------------------------------------------

ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_profile_label_unique;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_profile_id_fkey;
DROP INDEX IF EXISTS idx_categories_profile_id;
ALTER TABLE categories DROP COLUMN IF EXISTS profile_id;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_label_unique;
ALTER TABLE categories ADD CONSTRAINT categories_label_unique UNIQUE (label);

-- ---------------------------------------------------------------------------
-- 4. Replace RLS policies — shared read/insert for authenticated users
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "categories_all_own" ON categories;
DROP POLICY IF EXISTS "categories_select_auth" ON categories;
DROP POLICY IF EXISTS "categories_insert_auth" ON categories;

CREATE POLICY "categories_select_auth" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_insert_auth" ON categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "tags_all_own" ON tags;
DROP POLICY IF EXISTS "tags_select_auth" ON tags;
DROP POLICY IF EXISTS "tags_insert_auth" ON tags;

CREATE POLICY "tags_select_auth" ON tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tags_insert_auth" ON tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 5. Seed global preset categories if table is empty
-- ---------------------------------------------------------------------------

INSERT INTO categories (slug, label, icon, color)
SELECT preset.slug, preset.label, preset.icon, preset.color
FROM (VALUES
  ('food', 'Food & Dining', '🍽️', '#FF6B6B'),
  ('transport', 'Transport', '🚗', '#4ECDC4'),
  ('groceries', 'Groceries', '🛒', '#45B7D1'),
  ('utilities', 'Utilities', '💡', '#FFE66D'),
  ('shopping', 'Shopping', '🛍️', '#A78BFA'),
  ('health', 'Health', '❤️', '#F472B6'),
  ('entertainment', 'Entertainment', '🎬', '#FB923C'),
  ('emi_rent', 'EMI / Rent', '🏠', '#34D399'),
  ('investments', 'Investments', '📈', '#60A5FA'),
  ('others', 'Others', '📦', '#94A3B8')
) AS preset(slug, label, icon, color)
WHERE NOT EXISTS (SELECT 1 FROM categories LIMIT 1);

-- ---------------------------------------------------------------------------
-- 6. Update admin functions (no profile scoping)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS admin_get_categories(text);

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
