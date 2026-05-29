import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth } from './firebase';
import { categoriesCollection, expensesCollection } from './utils/paths';
import {
  clearActiveProfile,
  loadActiveProfile,
  saveActiveProfile,
} from './utils/profiles';
import UserSelect from './components/UserSelect';
import AddExpense from './components/AddExpense';
import ExpenseLog from './components/ExpenseLog';
import Report from './components/Report';
import './App.css';

const TABS = [
  { id: 'home', label: 'Home', icon: '₹' },
  { id: 'log', label: 'Log', icon: '📋' },
  { id: 'report', label: 'Report', icon: '📊' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeProfile, setActiveProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthError(null);
        setActiveProfile(loadActiveProfile(currentUser.uid));
      } else {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          setAuthError('Unable to connect. Check your Firebase configuration.');
          console.error('Anonymous sign-in failed:', err);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !activeProfile) return;

    const unsubscribe = onSnapshot(
      categoriesCollection(user.uid, activeProfile.id),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data());
        items.sort((a, b) => a.label.localeCompare(b.label));
        setCategories(items);
      }
    );

    return () => unsubscribe();
  }, [user, activeProfile]);

  useEffect(() => {
    if (!user || !activeProfile) return;

    const q = query(
      expensesCollection(user.uid, activeProfile.id),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...d.data(), docId: d.id }));
      items.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      setExpenses(items);
    });

    return () => unsubscribe();
  }, [user, activeProfile]);

  const handleSelectProfile = (profile) => {
    setActiveProfile(profile);
    saveActiveProfile(user.uid, profile);
    setActiveTab('home');
  };

  const handleSwitchUser = () => {
    clearActiveProfile(user.uid);
    setActiveProfile(null);
    setCategories([]);
    setExpenses([]);
    setActiveTab('home');
  };

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="app-shell">
        <div className="error-screen">
          <span className="error-icon">⚠️</span>
          <h1>Connection Error</h1>
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <h1>Personal Finance Tracker</h1>
        </header>
        <main className="app-main app-main--home">
          <UserSelect authUid={user.uid} onSelectProfile={handleSelectProfile} />
        </main>
      </div>
    );
  }

  const isHome = activeTab === 'home';

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Personal Finance Tracker</h1>
        <p className="app-header-user">
          {activeProfile.name}
          <button type="button" className="switch-user-btn" onClick={handleSwitchUser}>
            Switch user
          </button>
        </p>
      </header>

      <main className={`app-main ${isHome ? 'app-main--home' : ''}`}>
        {activeTab === 'home' && (
          <AddExpense
            authUid={user.uid}
            profileId={activeProfile.id}
            categories={categories}
          />
        )}
        {activeTab === 'log' && (
          <ExpenseLog
            authUid={user.uid}
            profileId={activeProfile.id}
            expenses={expenses}
            categories={categories}
          />
        )}
        {activeTab === 'report' && (
          <Report expenses={expenses} categories={categories} />
        )}
      </main>

      <nav className="tab-bar" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
