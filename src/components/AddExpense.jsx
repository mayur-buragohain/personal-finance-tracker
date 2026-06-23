import { useCallback, useEffect, useRef, useState } from 'react';
import { addCategory } from '../utils/categories';
import { createExpense } from '../utils/expenses';
import { addTag, subscribeTags } from '../utils/tags';
import { randomCategoryColor, todayISO, EXPENSE_NOTE_MAX } from '../utils/helpers';

export default function AddExpense({ profileId, categories }) {
  const dateInputRef = useRef(null);
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [tags, setTags] = useState([]);
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
  const [showNoteField, setShowNoteField] = useState(false);
  const [note, setNote] = useState('');

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
        note,
      });

      setAmount('');
      setCategoryId('');
      setSelectedTagIds([]);
      setNote('');
      setShowNoteField(false);
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
    <section className="home-card fade-in">
      <div className="add-date-wrap">
        <label htmlFor="expense-date" className="add-date-field" onClick={openDatePicker}>
          <input
            ref={dateInputRef}
            id="expense-date"
            type="date"
            className="text-input date-input add-date-input"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSaved(false);
            }}
            onClick={openDatePicker}
            aria-label="Expense date"
          />
        </label>
      </div>

      <div className="amount-section amount-section--hero">
        <label htmlFor="amount" className="field-label field-label--soft">
          Amount
        </label>
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

      <div className="home-card-section">
        <span className="field-label field-label--soft">Category</span>
        <div className="category-grid category-grid--compact category-grid--4col">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`category-chip category-chip--compact ${categoryId === cat.id ? 'selected' : ''}`}
              style={{ '--cat-color': cat.color }}
              onClick={() => selectCategory(cat.id)}
              aria-pressed={categoryId === cat.id}
              title={cat.label}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-label">{cat.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="category-chip category-chip--compact add-new"
            onClick={openCategoryModal}
            aria-label="Add new category"
          >
            <span className="category-icon">+</span>
            <span className="category-label">New</span>
          </button>
        </div>
      </div>

      {categoryId && (
        <div className="home-card-section home-card-section--tags">
          <span className="field-label field-label--soft">Tags</span>
          <div className="option-chips home-tag-chips" role="group" aria-label="Select tags">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`option-chip option-chip--tag ${selectedTagIds.includes(tag.id) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag.id)}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <button type="button" className="text-link-btn" onClick={openTagModal}>
            + Add tag
          </button>
        </div>
      )}

      {!showNoteField ? (
        <button type="button" className="text-link-btn" onClick={() => setShowNoteField(true)}>
          + Add note
        </button>
      ) : (
        <div className="home-card-section">
          <label htmlFor="expense-note" className="field-label field-label--soft">
            Note
          </label>
          <input
            id="expense-note"
            type="text"
            className="text-input home-note-input"
            placeholder="e.g. Lunch with team"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setSaved(false);
            }}
            maxLength={EXPENSE_NOTE_MAX}
          />
        </div>
      )}

      <div className="home-card-footer">
        <button
          type="button"
          className="primary-btn home-card-save"
          disabled={!canSave}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save expense'}
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
