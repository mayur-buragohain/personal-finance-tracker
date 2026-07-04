import { useCallback, useEffect, useRef, useState } from 'react';
import { addCategory } from '../utils/categories';
import { createExpense } from '../utils/expenses';
import { addTag, subscribeTags } from '../utils/tags';
import {
  addDaysISO,
  formatDatePill,
  randomCategoryColor,
  todayISO,
  EXPENSE_NOTE_MAX,
} from '../utils/helpers';

export default function AddExpense({ profileId, categories }) {
  const dateInputRef = useRef(null);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tags, setTags] = useState([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📌');
  const [categoryError, setCategoryError] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagError, setTagError] = useState('');
  const [addingTag, setAddingTag] = useState(false);

  useEffect(() => {
    if (!categoryId) {
      setTags([]);
      return;
    }
    return subscribeTags(categoryId, setTags);
  }, [categoryId]);

  const openDatePicker = useCallback(() => {
    const input = dateInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        /* showPicker unavailable or blocked */
      }
    }
  }, []);

  const shiftDate = (days) => {
    setDate((current) => addDaysISO(current, days));
    setSaved(false);
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      setSaved(false);
    }
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0 || !categoryId) return;

    setSaving(true);
    setSaved(false);

    try {
      await createExpense(profileId, {
        amount: parsedAmount,
        categoryId,
        date,
        tagIds: selectedTagIds,
        note: note.trim(),
      });

      setAmount('');
      setCategoryId('');
      setSelectedTagIds([]);
      setNote('');
      setDate(todayISO());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save expense:', err);
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
    if (categories.some((c) => c.label.toLowerCase() === label.toLowerCase())) {
      setCategoryError('Category already exists');
      return;
    }

    setCategoryError('');
    setAddingCategory(true);

    try {
      const category = await addCategory({
        label,
        icon: newCategoryEmoji.trim(),
        color: randomCategoryColor(),
      });
      setCategoryId(category.id);
      setSelectedTagIds([]);
      setNewCategoryName('');
      setNewCategoryEmoji('📌');
      setShowCategoryModal(false);
      setSaved(false);
    } catch (err) {
      setCategoryError('Failed to create category');
      console.error(err);
    } finally {
      setAddingCategory(false);
    }
  };

  const handleCreateTag = async () => {
    const label = newTagName.trim();
    if (!label) {
      setTagError('Enter a tag name');
      return;
    }
    if (tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setTagError('Tag already exists for this category');
      return;
    }

    setTagError('');
    setAddingTag(true);

    try {
      const tag = await addTag(categoryId, label);
      setSelectedTagIds((prev) => [...prev, tag.id]);
      setNewTagName('');
      setShowTagModal(false);
      setSaved(false);
    } catch (err) {
      setTagError('Failed to create tag');
      console.error(err);
    } finally {
      setAddingTag(false);
    }
  };

  const selectCategory = (id) => {
    setCategoryId(id);
    setSelectedTagIds([]);
    setSaved(false);
  };

  const toggleTag = (id) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setSaved(false);
  };

  const openCategoryModal = () => {
    setCategoryError('');
    setNewCategoryName('');
    setNewCategoryEmoji('📌');
    setShowCategoryModal(true);
  };

  const openTagModal = () => {
    setTagError('');
    setNewTagName('');
    setShowTagModal(true);
  };

  const canSave = amount && parseFloat(amount) > 0 && categoryId && !saving;

  return (
    <section className="add-expense fade-in">
      <div className="quick-entry">
        <div className="date-pill-nav">
          <button
            type="button"
            className="date-shift-btn"
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
          >
            ‹
          </button>
          <label htmlFor="expense-date" className="date-pill" onClick={openDatePicker}>
            <span className="date-pill-text">{formatDatePill(date)}</span>
            <input
              ref={dateInputRef}
              id="expense-date"
              type="date"
              className="date-pill-input date-input"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setSaved(false);
              }}
              onClick={openDatePicker}
              aria-label="Expense date"
            />
          </label>
          <button
            type="button"
            className="date-shift-btn"
            onClick={() => shiftDate(1)}
            aria-label="Next day"
          >
            ›
          </button>
        </div>

        <div className="quick-entry-amount">
          <span className="currency-symbol currency-symbol--hero">₹</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            className="amount-input amount-input--hero"
            placeholder="0"
            value={amount}
            onChange={handleAmountChange}
            autoComplete="off"
            aria-label="Amount"
          />
        </div>
      </div>

      <div className="add-expense-section add-expense-section--category">
        <div className="category-grid category-grid--add" role="group" aria-label="Select category">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-pill category-pill--grid ${categoryId === cat.id ? 'selected' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => selectCategory(cat.id)}
              aria-pressed={categoryId === cat.id}
              title={cat.label}
            >
              <span className="category-pill-icon">{cat.icon}</span>
              <span className="category-pill-label">{cat.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="category-pill category-pill--grid category-pill--new"
            onClick={openCategoryModal}
            aria-label="Add new category"
          >
            <span className="category-pill-icon">+</span>
            <span className="category-pill-label">New</span>
          </button>
        </div>
      </div>

      {categoryId && (
        <div className="add-expense-section add-expense-section--tags">
          <span className="add-expense-note-label">Tags</span>
          <div className="add-expense-tag-chips" role="group" aria-label="Select tags">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`add-expense-tag-chip ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.label}
              </button>
            ))}
            <button
              type="button"
              className="add-expense-tag-chip add-expense-tag-chip--new"
              onClick={openTagModal}
              aria-label="Add new tag"
            >
              + New
            </button>
          </div>
        </div>
      )}

      <div className={`add-expense-section add-expense-section--note${categoryId ? ' add-expense-section--note-active' : ''}`}>
        <label htmlFor="expense-note" className="add-expense-note-label">
          Note <span className="add-expense-optional">(optional)</span>
        </label>
        <input
          id="expense-note"
          type="text"
          className={`add-expense-note-input${categoryId ? ' add-expense-note-input--active' : ''}`}
          placeholder={categoryId ? 'Add a note or #tag...' : 'Select a category first'}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          maxLength={EXPENSE_NOTE_MAX}
          disabled={!categoryId}
        />
      </div>

      <div className="add-expense-actions">
        <button
          type="button"
          className="primary-btn add-expense-save"
          disabled={!canSave}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : '✓ Save expense'}
        </button>
        {saved && (
          <p className="success-toast" role="status">
            Saved successfully
          </p>
        )}
      </div>

      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div
            className="bottom-sheet slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="new-category-title"
          >
            <div className="sheet-handle" />
            <h2 id="new-category-title" className="sheet-title">
              New Category
            </h2>

            <div className="field-group field-group--centered">
              <label htmlFor="emoji" className="field-label">
                Emoji
              </label>
              <input
                id="emoji"
                type="text"
                className="text-input emoji-input landing-control"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                maxLength={4}
              />
            </div>

            <div className="field-group field-group--centered">
              <label htmlFor="cat-name" className="field-label">
                Name
              </label>
              <input
                id="cat-name"
                type="text"
                className="text-input landing-control"
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
                disabled={addingCategory}
                onClick={handleCreateCategory}
              >
                {addingCategory ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTagModal && (
        <div className="modal-overlay" onClick={() => setShowTagModal(false)}>
          <div
            className="bottom-sheet slide-up"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="new-tag-title"
          >
            <div className="sheet-handle" />
            <h2 id="new-tag-title" className="sheet-title">
              New Tag
            </h2>
            <p className="sheet-subtitle">
              For {categories.find((c) => c.id === categoryId)?.label}
            </p>

            <div className="field-group field-group--centered">
              <label htmlFor="tag-name" className="field-label">
                Name
              </label>
              <input
                id="tag-name"
                type="text"
                className="text-input landing-control"
                placeholder="e.g. Eat out"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={40}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && newTagName.trim() && handleCreateTag()}
              />
            </div>

            {tagError && <p className="field-error">{tagError}</p>}

            <div className="sheet-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowTagModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={addingTag || !newTagName.trim()}
                onClick={handleCreateTag}
              >
                {addingTag ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
