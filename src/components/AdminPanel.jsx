import { useState } from 'react';
import { clearAdminSession } from '../utils/admin';
import AdminUsers from './AdminUsers';
import AdminCategories from './AdminCategories';

const ADMIN_TABS = [
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'categories', label: 'Categories', icon: '🏷️' },
];

export default function AdminPanel({ authUid, onLogout }) {
  const [activeTab, setActiveTab] = useState('users');

  const handleLogout = () => {
    clearAdminSession();
    onLogout();
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Admin</h1>
        <p className="app-header-user">
          Administrator
          <button type="button" className="switch-user-btn" onClick={handleLogout}>
            Sign out
          </button>
        </p>
      </header>

      <main className="app-main">
        {activeTab === 'users' && <AdminUsers authUid={authUid} />}
        {activeTab === 'categories' && <AdminCategories />}
      </main>

      <nav className="tab-bar" role="tablist">
        {ADMIN_TABS.map((tab) => (
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
