import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from './firebase';
import { seedCategories } from './utils/categories';
import AddExpense from './components/AddExpense';
import ExpenseLog from './components/ExpenseLog';
import Report from './components/Report';
import './App.css';

const TABS = [
  { id: 'add', label: 'Add', icon: '➕' },
  { id: 'log', label: 'Log', icon: '📋' },
  { id: 'report', label: 'Report', icon: '📊' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('add');
  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthError(null);
        try {
          await seedCategories(currentUser.uid);
        } catch (err) {
          console.error('Failed to seed categories:', err);
        }
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
    if (!user) return;

    const categoriesRef = collection(db, 'users', user.uid, 'categories');
    const unsubscribe = onSnapshot(categoriesRef, (snapshot) => {
      const items = snapshot.docs.map((d) => d.data());
      items.sort((a, b) => a.label.localeCompare(b.label));
      setCategories(items);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const expensesRef = collection(db, 'users', user.uid, 'expenses');
    const q = query(expensesRef, orderBy('date', 'desc'));
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
  }, [user]);

  if (authLoading) {
    return (
      <div className="app-shell">
        <div className="loading-screen">
          <div className="spinner" />
          <p>Loading your tracker…</p>
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

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Expense Tracker</h1>
        <p className="app-subtitle">Track daily spending in ₹</p>
      </header>

      <main className="app-main">
        {activeTab === 'add' && (
          <AddExpense user={user} categories={categories} />
        )}
        {activeTab === 'log' && (
          <ExpenseLog user={user} expenses={expenses} categories={categories} />
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
