import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { addCategory } from '../utils/categories';
import { slugify, randomCategoryColor, todayISO } from '../utils/helpers';

export default function AddExpense({ user, categories }) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📌');
  const [categoryError, setCategoryError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleAddExpense = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!categoryId) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      const expensesRef = collection(db, 'users', user.uid, 'expenses');
      await addDoc(expensesRef, {
        amount: parsedAmount,
        categoryId,
        note: note.trim(),
        date,
        createdAt: serverTimestamp(),
      });

      setAmount('');
      setNote('');
      setDate(todayISO());
      setSuccessMessage('Expense added!');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('Failed to add expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    const label = newCategoryName.trim();
    if (!label) {
      setCategoryError('Enter a category name');
      return;
    }
    if (!newCategoryEmoji.trim()) {
      setCategoryError('Pick an emoji');
      return;
    }

    const id = slugify(label);
    const exists = categories.some((c) => c.id === id);
    if (exists) {
      setCategoryError('Category already exists');
      return;
    }

    setCategoryError('');

    try {
      const category = {
        id,
        label,
        icon: newCategoryEmoji.trim(),
        color: randomCategoryColor(),
      };
      await addCategory(user.uid, category);
      setCategoryId(id);
      setNewCategoryName('');
      setNewCategoryEmoji('📌');
      setShowCategoryModal(false);
    } catch (err) {
      setCategoryError('Failed to create category');
      console.error(err);
    }
  };

  const canSubmit = amount && parseFloat(amount) > 0 && categoryId && !saving;

  return (
    <section className="panel add-expense fade-in">
      <div className="amount-section">
        <label htmlFor="amount" className="field-label">Amount (₹)</label>
        <div className="amount-input-wrap">
          <span className="currency-symbol">₹</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            className="amount-input"
            placeholder="0"
            value={amount}
            onChange={handleAmountChange}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="field-group">
        <span className="field-label">Category</span>
        <div className="category-grid">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-chip ${categoryId === cat.id ? 'selected' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => setCategoryId(cat.id)}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-label">{cat.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="category-chip add-new"
            onClick={() => setShowCategoryModal(true)}
          >
            <span className="category-icon">➕</span>
            <span className="category-label">Add New</span>
          </button>
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="note" className="field-label">Note (optional)</label>
        <input
          id="note"
          type="text"
          className="text-input"
          placeholder="What was this for?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="field-group">
        <label htmlFor="date" className="field-label">Date</label>
        <input
          id="date"
          type="date"
          className="text-input date-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <button
        type="button"
        className="primary-btn"
        disabled={!canSubmit}
        onClick={handleAddExpense}
      >
        {saving ? 'Adding…' : 'Add Expense'}
      </button>

      {successMessage && (
        <p className="success-toast" role="status">{successMessage}</p>
      )}

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div
            className="bottom-sheet slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="new-category-title"
          >
            <div className="sheet-handle" />
            <h2 id="new-category-title" className="sheet-title">New Category</h2>

            <div className="field-group">
              <label htmlFor="emoji" className="field-label">Emoji</label>
              <input
                id="emoji"
                type="text"
                className="text-input emoji-input"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="field-group">
              <label htmlFor="cat-name" className="field-label">Name</label>
              <input
                id="cat-name"
                type="text"
                className="text-input"
                placeholder="e.g. Pet Care"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                maxLength={40}
              />
            </div>

            {categoryError && <p className="field-error">{categoryError}</p>}

            <div className="sheet-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowCategoryModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={handleCreateCategory}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
