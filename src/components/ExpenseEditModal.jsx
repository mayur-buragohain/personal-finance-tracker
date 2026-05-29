import { useEffect, useState } from 'react';
import { deleteField, onSnapshot, updateDoc } from 'firebase/firestore';
import { addCategory } from '../utils/categories';
import { addTag } from '../utils/tags';
import { expenseDoc, tagsCollection } from '../utils/paths';
import {
  ADD_CATEGORY,
  buildTagsPayload,
  getExpenseTags,
  randomCategoryColor,
  slugify,
  formatINR,
} from '../utils/helpers';

export default function ExpenseEditModal({
  expense,
  authUid,
  profileId,
  categories,
  onClose,
}) {
  const [date, setDate] = useState(expense.date);
  const [categoryId, setCategoryId] = useState(expense.categoryId);
  const [selectedTagIds, setSelectedTagIds] = useState(() =>
    getExpenseTags(expense).map((t) => t.id)
  );
  const [categoryTags, setCategoryTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
      setCategoryTags([]);
      return;
    }

    const unsubscribe = onSnapshot(
      tagsCollection(authUid, profileId, categoryId),
      (snapshot) => {
        const items = snapshot.docs.map((d) => d.data());
        items.sort((a, b) => a.label.localeCompare(b.label));
        setCategoryTags(items);
      }
    );

    return () => unsubscribe();
  }, [authUid, profileId, categoryId]);

  useEffect(() => {
    setSelectedTagIds((prev) =>
      prev.filter((id) => categoryTags.some((t) => t.id === id))
    );
  }, [categoryTags]);

  const toggleTag = (id) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!categoryId) {
      setError('Select a category');
      return;
    }

    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    setSaving(true);
    setError('');

    try {
      const tags = buildTagsPayload(selectedTagIds, categoryTags);
      const update = {
        date,
        categoryId: category.id,
        categoryLabel: category.label,
        categoryIcon: category.icon,
        tags,
        tagId: deleteField(),
        tagLabel: deleteField(),
      };

      await updateDoc(expenseDoc(authUid, profileId, expense.docId), update);
      onClose();
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
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
    if (categories.some((c) => c.id === id)) {
      setCategoryError('Category already exists');
      return;
    }

    setCategoryError('');
    setAddingCategory(true);

    try {
      await addCategory(authUid, profileId, {
        id,
        label,
        icon: newCategoryEmoji.trim(),
        color: randomCategoryColor(),
      });
      setCategoryId(id);
      setSelectedTagIds([]);
      setNewCategoryName('');
      setNewCategoryEmoji('📌');
      setShowCategoryModal(false);
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

    const id = slugify(label);
    if (categoryTags.some((t) => t.id === id)) {
      setTagError('Tag already exists for this category');
      return;
    }

    setTagError('');
    setAddingTag(true);

    try {
      await addTag(authUid, profileId, categoryId, { id, label });
      setSelectedTagIds((prev) => [...prev, id]);
      setNewTagName('');
      setShowTagModal(false);
    } catch (err) {
      setTagError('Failed to create tag');
      console.error(err);
    } finally {
      setAddingTag(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bottom-sheet slide-up edit-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-expense-title"
      >
        <div className="sheet-handle" />
        <h2 id="edit-expense-title" className="sheet-title">Edit Expense</h2>
        <p className="sheet-subtitle">{formatINR(expense.amount)}</p>

        <div className="field-group field-group--centered">
          <label htmlFor="edit-date" className="field-label">Date</label>
          <input
            id="edit-date"
            type="date"
            className="text-input date-input landing-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="field-group field-group--centered">
          <label htmlFor="edit-category" className="field-label">Category</label>
          <select
            id="edit-category"
            className="text-input select-input landing-control"
            value={categoryId}
            onChange={(e) => {
              const value = e.target.value;
              if (value === ADD_CATEGORY) {
                setShowCategoryModal(true);
                return;
              }
              setCategoryId(value);
              setSelectedTagIds([]);
            }}
          >
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
            {categoryTags.length > 0 && (
              <>
                <span className="field-label">Tags</span>
                <div className="option-chips" role="group" aria-label="Select tags">
                  {categoryTags.map((tag) => (
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
            <button
              type="button"
              className="add-category-link"
              onClick={() => {
                setTagError('');
                setNewTagName('');
                setShowTagModal(true);
              }}
            >
              + Add new tag
            </button>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <div className="sheet-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {showCategoryModal && (
        <div className="modal-overlay modal-overlay--nested" onClick={() => setShowCategoryModal(false)}>
          <div className="bottom-sheet slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 className="sheet-title">New Category</h2>
            <div className="field-group field-group--centered">
              <label htmlFor="edit-emoji" className="field-label">Emoji</label>
              <input
                id="edit-emoji"
                type="text"
                className="text-input emoji-input landing-control"
                value={newCategoryEmoji}
                onChange={(e) => setNewCategoryEmoji(e.target.value)}
                maxLength={4}
              />
            </div>
            <div className="field-group field-group--centered">
              <label htmlFor="edit-cat-name" className="field-label">Name</label>
              <input
                id="edit-cat-name"
                type="text"
                className="text-input landing-control"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                maxLength={40}
              />
            </div>
            {categoryError && <p className="field-error">{categoryError}</p>}
            <div className="sheet-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowCategoryModal(false)}>
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
        <div className="modal-overlay modal-overlay--nested" onClick={() => setShowTagModal(false)}>
          <div className="bottom-sheet slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 className="sheet-title">New Tag</h2>
            <div className="field-group field-group--centered">
              <label htmlFor="edit-tag-name" className="field-label">Name</label>
              <input
                id="edit-tag-name"
                type="text"
                className="text-input landing-control"
                placeholder="e.g. Eat out"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={40}
                autoFocus
              />
            </div>
            {tagError && <p className="field-error">{tagError}</p>}
            <div className="sheet-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowTagModal(false)}>
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
    </div>
  );
}
