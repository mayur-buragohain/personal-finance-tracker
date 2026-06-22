import { useEffect, useState } from 'react';
import { addCategory } from '../utils/categories';
import { createExpense } from '../utils/expenses';
import { addTag, subscribeTags } from '../utils/tags';
import { randomCategoryColor, todayISO, ADD_CATEGORY, EXPENSE_NOTE_MAX } from '../utils/helpers';

export default function AddExpense({ profileId, categories }) {
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
    <section className="landing fade-in">
      <div className="field-group field-group--centered">
        <label htmlFor="date" className="field-label">Date</label>
        <input
          id="date"
          type="date"
          className="text-input date-input landing-control"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div className="amount-section">
        <label htmlFor="amount" className="field-label">Amount</label>
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

      <div className="field-group field-group--centered">
        <label htmlFor="category" className="field-label">Category</label>
        <select
          id="category"
          className="text-input select-input landing-control"
          value={categoryId}
          onChange={(e) => {
            const value = e.target.value;
            if (value === ADD_CATEGORY) {
              openCategoryModal();
              return;
            }
            setCategoryId(value);
            setSelectedTagIds([]);
            setSaved(false);
          }}
        >
          <option value="">Select category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label}
            </option>
          ))}
          <option value={ADD_CATEGORY}>+ Add new category</option>
        </select>
      </div>

      {categoryId && (
        <div className="field-group field-group--centered">
          {tags.length > 0 && (
            <>
              <span className="field-label">Tags</span>
              <div className="option-chips" role="group" aria-label="Select tags">
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
            </>
          )}
          <button type="button" className="add-category-link" onClick={openTagModal}>
            + Add new tag
          </button>
        </div>
      )}

      {!showNoteField ? (
        <button
          type="button"
          className="add-category-link"
          onClick={() => setShowNoteField(true)}
        >
          + Add note (optional)
        </button>
      ) : (
        <div className="field-group field-group--centered">
          <label htmlFor="expense-note" className="field-label">Note</label>
          <input
            id="expense-note"
            type="text"
            className="text-input landing-control"
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

      <div className="landing-actions">
        <button
          type="button"
          className="primary-btn save-btn landing-control"
          disabled={!canSave}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {saved && <p className="success-toast" role="status">Saved</p>}
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
            <h2 id="new-category-title" className="sheet-title">New Category</h2>

            <div className="field-group field-group--centered">
              <label htmlFor="emoji" className="field-label">Emoji</label>
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
              <label htmlFor="cat-name" className="field-label">Name</label>
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
            <h2 id="new-tag-title" className="sheet-title">New Tag</h2>
            <p className="sheet-subtitle">
              For {categories.find((c) => c.id === categoryId)?.label}
            </p>

            <div className="field-group field-group--centered">
              <label htmlFor="tag-name" className="field-label">Name</label>
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
