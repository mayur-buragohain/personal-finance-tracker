-- Personal Finance Tracker — initial schema
-- Run after 000_reset.sql (or on a fresh Supabase project).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  passkey_hash TEXT,
  passkey_salt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_name_lower_unique ON profiles (lower(trim(name)));

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT categories_label_unique UNIQUE (label)
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tags_category_label_unique UNIQUE (category_id, label)
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expense_tags (
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (expense_id, tag_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_tags_category_id ON tags(category_id);
CREATE INDEX idx_expenses_profile_id_date ON expenses(profile_id, date DESC);
CREATE INDEX idx_expenses_category_id ON expenses(category_id);
CREATE INDEX idx_expense_tags_tag_id ON expense_tags(tag_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_tags ENABLE ROW LEVEL SECURITY;

-- Profiles: global list on login page
CREATE POLICY "profiles_select_auth" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "profiles_insert_auth" ON profiles
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Categories & tags: shared globally
CREATE POLICY "categories_select_auth" ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "categories_insert_auth" ON categories
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tags_select_auth" ON tags
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tags_insert_auth" ON tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Expenses: per profile, any authenticated user (passkey gates profile access in the app)
CREATE POLICY "expenses_all_auth" ON expenses
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = expenses.profile_id)
  ) WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = profile_id)
  );

CREATE POLICY "expense_tags_all_auth" ON expense_tags
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM expenses e
      JOIN profiles p ON p.id = e.profile_id
      WHERE e.id = expense_tags.expense_id
    )
  ) WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM expenses e
      JOIN profiles p ON p.id = e.profile_id
      WHERE e.id = expense_tags.expense_id
    )
    AND EXISTS (
      SELECT 1 FROM tags t
      JOIN expenses e ON e.id = expense_tags.expense_id
      WHERE t.id = expense_tags.tag_id AND t.category_id = e.category_id
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE tags;
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE expense_tags;

-- Seed global preset categories
INSERT INTO categories (slug, label, icon, color) VALUES
  ('food', 'Food & Dining', '🍽️', '#FF6B6B'),
  ('transport', 'Transport', '🚗', '#4ECDC4'),
  ('groceries', 'Groceries', '🛒', '#45B7D1'),
  ('utilities', 'Utilities', '💡', '#FFE66D'),
  ('shopping', 'Shopping', '🛍️', '#A78BFA'),
  ('health', 'Health', '❤️', '#F472B6'),
  ('entertainment', 'Entertainment', '🎬', '#FB923C'),
  ('emi_rent', 'EMI / Rent', '🏠', '#34D399'),
  ('investments', 'Investments', '📈', '#60A5FA'),
  ('others', 'Others', '📦', '#94A3B8');
