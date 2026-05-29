
# Project Title

A brief description of what this project does and who it's for

# Expense Tracker

A mobile-first personal daily expense tracker built with React, Vite, and Firebase Firestore. Track spending in INR (₹), view logs in real time, and analyze monthly reports — all with silent anonymous authentication (no login screen).

## Features

- **Add Expense** — Large amount input, tap-friendly category grid, optional notes, date picker
- **Expense Log** — Real-time list with swipe or tap-to-delete
- **Monthly Report** — Category breakdown, daily spending chart, top 5 expenses
- **Custom Categories** — Add your own categories with emoji and name
- **Dark Theme** — Mobile-first UI, max 480px width, centered on desktop
- **INR Formatting** — Indian number formatting (e.g. ₹1,25,000)

## Tech Stack

- React + Vite (frontend)
- Firebase Firestore (database)
- Firebase Anonymous Authentication (silent auth)
- Vercel (hosting)

---

## Step-by-Step Setup Guide

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Follow the prompts to create your project.
3. Once created, open your project dashboard.

### 2. Enable Firestore

1. In the left sidebar, go to **Build → Firestore Database**.
2. Click **Create database**.
3. Choose **Start in production mode** (we'll add security rules next).
4. Select a Cloud Firestore location close to your users and click **Enable**.

### 3. Deploy Firestore Security Rules

1. In Firestore, go to the **Rules** tab.
2. Replace the default rules with the contents of `firestore.rules` from this repo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**.

### 4. Enable Anonymous Authentication

1. In the left sidebar, go to **Build → Authentication**.
2. Click **Get started**.
3. Go to the **Sign-in method** tab.
4. Click **Anonymous** and toggle it **Enable**.
5. Click **Save**.

### 5. Register a Web App and Copy Config Keys

1. Go to **Project Settings** (gear icon) → **General**.
2. Under **Your apps**, click the web icon (`</>`) to register a new web app.
3. Give it a nickname (e.g. "Expense Tracker") and click **Register app**.
4. Copy the `firebaseConfig` values — you'll need them for your `.env` file.

### 6. Clone the Repository and Add Environment Variables

```bash
git clone https://github.com/YOUR_USERNAME/expense-tracker.git
cd expense-tracker
```

Copy the example env file and fill in your Firebase config:

```bash
cp .env.example .env
```

Edit `.env` with your Firebase values:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

> **Never commit `.env` to Git.** It is listed in `.gitignore`.

### 7. Install Dependencies and Run Locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`). The app will silently sign you in anonymously and seed preset categories on first load.

### 8. Push to a GitHub Public Repository

```bash
git init
git add .
git commit -m "Initial commit: expense tracker app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### 9. Connect GitHub Repo to Vercel

1. Go to [Vercel](https://vercel.com/) and sign in with GitHub.
2. Click **Add New → Project**.
3. Import your `expense-tracker` repository.
4. Vercel auto-detects Vite — keep the default build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Do **not** deploy yet — add environment variables first.

### 10. Add Environment Variables in Vercel

In the Vercel project settings, go to **Settings → Environment Variables** and add all six variables:

| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |

Apply them to **Production**, **Preview**, and **Development** environments.

### 11. Deploy

Click **Deploy** (or push a new commit to trigger automatic deployment). Once complete, your app is live at your Vercel URL (e.g. `https://expense-tracker.vercel.app`).

### 12. Bookmark on Android / iOS Home Screen

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
├── firestore.rules
├── README.md
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── firebase.js
    ├── index.css
    ├── App.css
    ├── utils/
    │   ├── helpers.js
    │   └── categories.js
    └── components/
        ├── AddExpense.jsx
        ├── ExpenseLog.jsx
        └── Report.jsx
```

## Data Model

**Expense** (`users/{uid}/expenses/{expenseId}`):

```json
{
  "amount": 250.00,
  "categoryId": "food",
  "note": "Lunch at office",
  "date": "2024-01-15",
  "createdAt": "timestamp"
}
```

**Category** (`users/{uid}/categories/{categoryId}`):

```json
{
  "id": "food",
  "label": "Food & Dining",
  "icon": "🍽️",
  "color": "#FF6B6B"
}
```

## License

MIT
