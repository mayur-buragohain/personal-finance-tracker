# Expense Tracker

A mobile-first personal daily expense tracker built with React, Vite, and Supabase (PostgreSQL). Track spending in INR (₹), view logs in real time, and analyze monthly reports — all with silent anonymous authentication (no login screen).

## Features

- **Multi-user profiles** — Separate expense data per household member, each protected by a passkey
- **Add Expense** — Date, amount, category, and optional multiple tags
- **Expense Log** — Grouped by date, filterable, editable, swipe/tap to delete
- **Monthly Report** — Category breakdown, daily spending chart, top 5 expenses
- **Custom Categories & Tags** — Tags are scoped per category; rename a category or tag in one place and all linked expenses reflect it instantly
- **Dark Theme** — Mobile-first UI, max 480px width, centered on desktop
- **INR Formatting** — Indian number formatting (e.g. ₹1,25,000)

## Tech Stack

- React + Vite (frontend)
- Supabase PostgreSQL (database)
- Supabase Anonymous Authentication (silent auth)
- Vercel (hosting)

---

## Step-by-Step Setup Guide

### 1. Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in.
2. Click **New project**.
3. Choose an organization, name your project, set a database password, and pick a region close to your users.
4. Wait for the project to finish provisioning.

### 2. Run the Database Migration

1. In your Supabase dashboard, open **SQL Editor**.
2. Click **New query**.
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql` from this repo and paste it into the editor.
4. Click **Run**.

This creates all tables (`profiles`, `categories`, `tags`, `expenses`, `expense_tags`), indexes, Row Level Security policies, and enables Realtime.

### 3. Enable Anonymous Authentication

1. In the Supabase dashboard, go to **Authentication → Providers**.
2. Find **Anonymous sign-ins** and enable it.
3. Save changes.

### 4. Copy API Keys

1. Go to **Project Settings → API**.
2. Copy your **Project URL** and **anon public** key — you'll need them for your `.env` file.

### 5. Clone the Repository and Add Environment Variables

```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker
```

Copy the example env file and fill in your Supabase values:

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

> **Never commit `.env` to Git.** It is listed in `.gitignore`.

### 6. Install Dependencies and Run Locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). The app will silently sign you in anonymously. Create a user profile on first launch — preset categories are seeded automatically.

### 7. Push to a GitHub Public Repository

```bash
git init
git add .
git commit -m "Initial commit: expense tracker app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### 8. Connect GitHub Repo to Vercel

1. Go to [Vercel](https://vercel.com/) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import your `expense-tracker` repository.
4. Vercel auto-detects Vite — keep the default build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Do **not** deploy yet — add environment variables first.

### 9. Add Environment Variables in Vercel

In the Vercel project settings, go to **Settings → Environment Variables** and add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |

Apply them to **Production**, **Preview**, and **Development** environments.

### 10. Deploy

Click **Deploy** (or push a new commit to trigger automatic deployment). Once complete, your app is live at your Vercel URL (e.g. `https://expense-tracker.vercel.app`).

### 11. Bookmark on Android / iOS Home Screen

**Android (Chrome):**
1. Open your Vercel URL in Chrome.
2. Tap the **⋮** menu → **Add to Home screen**.
3. Confirm the name and tap **Add**.

**iOS (Safari):**
1. Open your Vercel URL in Safari.
2. Tap the **Share** button (square with arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

The app will launch fullscreen like a native app.

---

## Project Structure

```
expense-tracker/
├── index.html
├── vite.config.js
├── .env.example
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── supabase.js
    ├── index.css
    ├── App.css
    ├── utils/
    │   ├── helpers.js
    │   ├── passkey.js
    │   ├── profiles.js
    │   ├── categories.js
    │   ├── tags.js
    │   └── expenses.js
    └── components/
        ├── UserSelect.jsx
        ├── AddExpense.jsx
        ├── ExpenseLog.jsx
        ├── ExpenseEditModal.jsx
        └── Report.jsx
```

## Data Model (PostgreSQL)

Each anonymous Supabase auth user owns one or more **profiles** (app users). All data is normalized with foreign keys — expenses store only `category_id` references, and tags are linked via a junction table. Renaming a category or tag updates a single row.

```
auth.users (Supabase)
  └── profiles
        ├── categories
        │     └── tags
        └── expenses
              └── expense_tags → tags
```

**profiles**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| auth_user_id | UUID | FK → auth.users |
| name | TEXT | Display name |
| passkey_hash | TEXT | SHA-256 hash |
| passkey_salt | TEXT | Random salt |

**categories**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → profiles |
| label | TEXT | Renaming updates one row |
| icon | TEXT | Emoji |
| color | TEXT | Hex color |

**tags**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| category_id | UUID | FK → categories |
| label | TEXT | Renaming updates one row |

**expenses**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| profile_id | UUID | FK → profiles |
| category_id | UUID | FK → categories |
| amount | NUMERIC | INR amount |
| date | DATE | Expense date |

**expense_tags** — many-to-many junction between expenses and tags.

Row Level Security ensures each authenticated user can only access data belonging to their own `auth_user_id`.

## License

MIT
