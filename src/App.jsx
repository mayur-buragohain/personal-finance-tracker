import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { subscribeCategories, seedGlobalCategories } from './utils/categories';
import { subscribeExpenses } from './utils/expenses';
import {
  clearActiveProfile,
  loadActiveProfile,
  saveActiveProfile,
} from './utils/profiles';
import { isAdminLoggedIn } from './utils/admin';
import UserSelect from './components/UserSelect';
import AdminPanel from './components/AdminPanel';
import AddExpense from './components/AddExpense';
import BulkExpense from './components/BulkExpense';
import ExpenseLog from './components/ExpenseLog';
import Report from './components/Report';
import './App.css';

const TABS = [
  { id: 'home', label: 'Home', icon: '₹' },
  { id: 'bulk', label: 'Bulk', icon: '⊕' },
  { id: 'log', label: 'Log', icon: '📋' },
  { id: 'report', label: 'Report', icon: '📊' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [activeProfile, setActiveProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(isAdminLoggedIn);
  const [activeTab, setActiveTab] = useState('home');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthError(null);
        setActiveProfile((prev) => prev ?? loadActiveProfile(session.user.id));
      }
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        supabase.auth.signInAnonymously().then(({ error }) => {
          if (error) {
            setAuthError('Unable to connect. Check your Supabase configuration.');
            console.error('Anonymous sign-in failed:', error);
            setAuthLoading(false);
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || isAdmin) return;
    seedGlobalCategories().catch((err) => console.error('Failed to seed categories:', err));
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || !activeProfile || isAdmin) return;
    return subscribeCategories(setCategories);
  }, [user, activeProfile, isAdmin]);

  useEffect(() => {
    if (!user || !activeProfile) return;
    return subscribeExpenses(activeProfile.id, setExpenses);
  }, [user, activeProfile]);

  const handleSelectProfile = (profile) => {
    setActiveProfile(profile);
    saveActiveProfile(user.id, profile);
    setActiveTab('home');
  };

  const handleSwitchUser = () => {
    clearActiveProfile(user.id);
    setActiveProfile(null);
    setCategories([]);
    setExpenses([]);
    setActiveTab('home');
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="app-shell">
        <div className="error-screen">
          <span className="error-icon">⚠️</span>
          <h1>Configuration Required</h1>
          <p>
            Add your Supabase credentials to <code>.env</code>:
          </p>
          <pre className="env-hint">{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key`}</pre>
          <p>Then restart the dev server with <code>npm run dev</code>.</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (authError || !user) {
    return (
      <div className="app-shell">
        <div className="error-screen">
          <span className="error-icon">⚠️</span>
          <h1>Connection Error</h1>
          <p>{authError || 'Unable to sign in. Check your Supabase configuration.'}</p>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return <AdminPanel onLogout={() => setIsAdmin(false)} />;
  }

  if (!activeProfile) {
    return (
      <div className="app-shell">
        <header className="app-header">
          <h1>Personal Finance Tracker</h1>
        </header>
        <main className="app-main app-main--home">
          <UserSelect
            onSelectProfile={handleSelectProfile}
            onAdminLogin={() => setIsAdmin(true)}
          />
        </main>
      </div>
    );
  }

  const isHome = activeTab === 'home';
  const isBulk = activeTab === 'bulk';

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

      <main className={`app-main ${isHome || isBulk ? 'app-main--home' : ''}`}>
        {activeTab === 'home' && (
          <AddExpense profileId={activeProfile.id} categories={categories} />
        )}
        {activeTab === 'bulk' && (
          <BulkExpense profileId={activeProfile.id} categories={categories} />
        )}
        {activeTab === 'log' && (
          <ExpenseLog
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
