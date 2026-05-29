import { useRef, useState } from 'react';
import { deleteDoc } from 'firebase/firestore';
import { expenseDoc } from '../utils/paths';
import { formatINR, formatDisplayDate, resolveCategory } from '../utils/helpers';

const SWIPE_THRESHOLD = 80;

export default function ExpenseLog({ authUid, profileId, expenses, categories }) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const [deletingId, setDeletingId] = useState(null);
  const swipeState = useRef({ id: null, startX: 0, currentX: 0 });

  const handleDelete = async (expense) => {
    if (deletingId) return;
    setDeletingId(expense.docId);

    try {
      await deleteDoc(expenseDoc(authUid, profileId, expense.docId));
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
      <p className="panel-hint">Swipe left or tap ✕ to delete</p>
      <ul className="expense-list">
        {expenses.map((expense) => {
          const category = resolveCategory(expense, categoryMap);
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
                  style={{ backgroundColor: `${category.color}22`, borderColor: category.color }}
                >
                  {category.icon}
                </div>
                <div className="expense-details">
                  <span className="expense-category">{category.label}</span>
                  {expense.tagLabel && (
                    <span className="expense-tag">{expense.tagLabel}</span>
                  )}
                  <span className="expense-date">{formatDisplayDate(expense.date)}</span>
                </div>
                <span className="expense-amount">{formatINR(expense.amount)}</span>
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
    </section>
  );
}
