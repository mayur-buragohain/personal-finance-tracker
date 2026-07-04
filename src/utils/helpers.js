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

export function formatMonthTrendLabel(monthKeyStr) {
  const [year, month] = monthKeyStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthName = date.toLocaleDateString('en-IN', { month: 'long' });
  return `${monthName}-${year}`;
}

export function formatMonthShortLabel(monthKeyStr) {
  const [year, month] = monthKeyStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'short' });
}

export function getLastNMonthKeys(count, endMonthKey = monthKey(todayISO())) {
  const [endYear, endMonth] = endMonthKey.split('-').map(Number);
  const keys = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(endYear, endMonth - 1 - i, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    keys.push(`${y}-${m}`);
  }
  return keys;
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

export function formatDatePill(dateStr) {
  if (dateStr === todayISO()) {
    return 'Today';
  }
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function addDaysISO(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function randomCategoryColor() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#60A5FA'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function resolveCategory(expense, categoryMap) {
  if (expense.category) {
    return expense.category;
  }
  return categoryMap[expense.categoryId] || {
    label: 'Unknown',
    icon: '📦',
    color: '#94A3B8',
  };
}

export function getExpenseTags(expense) {
  if (Array.isArray(expense.tags)) {
    return expense.tags;
  }
  return [];
}

export const ADD_CATEGORY = '__add_new__';

export const EXPENSE_NOTE_MAX = 200;

export function normalizeExpenseNote(note) {
  const trimmed = note?.trim() ?? '';
  return trimmed || null;
}
