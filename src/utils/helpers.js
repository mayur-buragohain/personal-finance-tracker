export const PRESET_CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍽️', color: '#FF6B6B' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#4ECDC4' },
  { id: 'groceries', label: 'Groceries', icon: '🛒', color: '#45B7D1' },
  { id: 'utilities', label: 'Utilities', icon: '💡', color: '#FFE66D' },
  { id: 'shopping', label: 'Shopping', icon: '🛍️', color: '#A78BFA' },
  { id: 'health', label: 'Health', icon: '❤️', color: '#F472B6' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#FB923C' },
  { id: 'emi_rent', label: 'EMI / Rent', icon: '🏠', color: '#34D399' },
  { id: 'investments', label: 'Investments', icon: '📈', color: '#60A5FA' },
  { id: 'others', label: 'Others', icon: '📦', color: '#94A3B8' },
];

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || `custom_${Date.now()}`;
}

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export function formatMonthLabel(monthKeyStr) {
  const [year, month] = monthKeyStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export function formatDisplayDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function randomCategoryColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#60A5FA'];
  return colors[Math.floor(Math.random() * colors.length)];
}
