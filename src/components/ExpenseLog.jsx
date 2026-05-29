import { useMemo, useRef, useState } from 'react';
import { deleteExpense } from '../utils/expenses';
import {
  formatDisplayDate,
  formatINR,
  getExpenseTags,
  resolveCategory,
} from '../utils/helpers';
import ExpenseEditModal from './ExpenseEditModal';

const SWIPE_THRESHOLD = 80;

export default function ExpenseLog({ profileId, expenses, categories }) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const [filterDate, setFilterDate] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const swipeState = useRef({ id: null, startX: 0, currentX: 0 });

  const availableDates = useMemo(() => {
    const dates = [...new Set(expenses.map((e) => e.date))];
    return dates.sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const filteredExpenses = useMemo(
    () => (filterDate ? expenses.filter((e) => e.date === filterDate) : expenses),
    [expenses, filterDate]
  );

  const groupedExpenses = useMemo(() => {
    const groups = {};
    filteredExpenses.forEach((expense) => {
      if (!groups[expense.date]) groups[expense.date] = [];
      groups[expense.date].push(expense);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items,
        total: items.reduce((sum, e) => sum + e.amount, 0),
      }));
  }, [filteredExpenses]);

  const handleDelete = async (expense) => {
    if (deletingId) return;
    setDeletingId(expense.docId);

    try {
      await deleteExpense(expense.id);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const onTouchStart = (e, expense) => {
    swipeState.current = {
      id: expense.docId,
      startX: e.touches[0].clientX,
      currentX: e.touches[0].clientX,
    };
  };

  const onTouchMove = (e, expense) => {
    if (swipeState.current.id !== expense.docId) return;
    swipeState.current.currentX = e.touches[0].clientX;
    const delta = swipeState.current.startX - swipeState.current.currentX;
    const row = e.currentTarget;
    if (delta > 0) {
      row.style.transform = `translateX(-${Math.min(delta, 100)}px)`;
    }
  };

  const onTouchEnd = (e, expense) => {
    const { startX, currentX, id } = swipeState.current;
    if (id !== expense.docId) return;

    const delta = startX - currentX;
    const row = e.currentTarget;
    row.style.transform = '';

    if (delta > SWIPE_THRESHOLD) {
      handleDelete(expense);
    }

    swipeState.current = { id: null, startX: 0, currentX: 0 };
  };

  if (expenses.length === 0) {
    return (
      <section className="panel fade-in">
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h2>No expenses yet</h2>
          <p>Add your first expense from the Home tab.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel expense-log fade-in">
      <div className="log-filter">
        <label htmlFor="date-filter" className="field-label">Filter by date</label>
        <select
          id="date-filter"
          className="text-input select-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        >
          <option value="">All dates</option>
          {availableDates.map((date) => (
            <option key={date} value={date}>
              {formatDisplayDate(date)}
            </option>
          ))}
        </select>
      </div>

      {groupedExpenses.length === 0 ? (
        <div className="empty-state compact">
          <p>No expenses for this date.</p>
        </div>
      ) : (
        groupedExpenses.map((group) => (
          <div key={group.date} className="expense-date-group">
            <div className="expense-date-header">
              <span className="expense-date-label">{formatDisplayDate(group.date)}</span>
              <span className="expense-date-total">{formatINR(group.total)}</span>
            </div>
            <ul className="expense-list">
              {group.items.map((expense) => {
                const category = resolveCategory(expense, categoryMap);
                const expenseTags = getExpenseTags(expense);
                const isDeleting = deletingId === expense.docId;

                return (
                  <li
                    key={expense.docId}
                    className={`expense-row ${isDeleting ? 'deleting' : ''}`}
                    onTouchStart={(e) => onTouchStart(e, expense)}
                    onTouchMove={(e) => onTouchMove(e, expense)}
                    onTouchEnd={(e) => onTouchEnd(e, expense)}
                  >
                    <div className="expense-row-content">
                      <div
                        className="expense-icon"
                        style={{
                          backgroundColor: `${category.color}22`,
                          borderColor: category.color,
                        }}
                      >
                        {category.icon}
                      </div>
                      <div className="expense-details">
                        <span className="expense-category">{category.label}</span>
                        {expenseTags.length > 0 && (
                          <div className="expense-tags">
                            {expenseTags.map((tag) => (
                              <span key={tag.id} className="expense-tag">
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="expense-amount">{formatINR(expense.amount)}</span>
                      <button
                        type="button"
                        className="edit-btn"
                        aria-label="Edit expense"
                        onClick={() => setEditingExpense(expense)}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="delete-btn"
                        aria-label="Delete expense"
                        onClick={() => handleDelete(expense)}
                        disabled={isDeleting}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      )}

      <p className="panel-hint">Swipe left or tap ✕ to delete</p>

      {editingExpense && (
        <ExpenseEditModal
          expense={editingExpense}
          profileId={profileId}
          categories={categories}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </section>
  );
}
