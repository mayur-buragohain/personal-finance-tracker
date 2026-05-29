import { useCallback, useEffect, useState } from 'react';
import {
  adminCreateTag,
  adminDeleteTag,
  adminFetchCategories,
  adminFetchTags,
  adminUpdateCategoryLabel,
  adminUpdateTagLabel,
  getAdminPassword,
} from '../utils/admin';

const MODES = {
  categories: 'categories',
  tags: 'tags',
};

export default function AdminCategories() {
  const [mode, setMode] = useState(MODES.categories);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingTags, setLoadingTags] = useState(false);
  const [error, setError] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryDraft, setCategoryDraft] = useState('');
  const [editingTagId, setEditingTagId] = useState(null);
  const [tagDraft, setTagDraft] = useState('');
  const [newTagLabel, setNewTagLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    setError('');
    try {
      const data = await adminFetchCategories(getAdminPassword());
      setCategories(data || []);
    } catch (err) {
      setError('Failed to load categories');
      console.error(err);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadTags = useCallback(async (categoryId) => {
    if (!categoryId) {
      setTags([]);
      return;
    }

    setLoadingTags(true);
    setError('');
    try {
      const data = await adminFetchTags(getAdminPassword(), categoryId);
      setTags(data || []);
    } catch (err) {
      setError('Failed to load tags');
      console.error(err);
    } finally {
      setLoadingTags(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (mode === MODES.tags) {
      loadTags(selectedCategoryId);
    }
  }, [mode, selectedCategoryId, loadTags]);

  useEffect(() => {
    if (mode === MODES.tags && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId('');
    }
  }, [mode, categories, selectedCategoryId]);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const startEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryDraft(category.label);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setCategoryDraft('');
  };

  const saveCategory = async (categoryId) => {
    const label = categoryDraft.trim();
    if (!label) return;

    setSaving(true);
    try {
      await adminUpdateCategoryLabel(getAdminPassword(), categoryId, label);
      cancelEditCategory();
      await loadCategories();
    } catch (err) {
      setError('Failed to update category');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEditTag = (tag) => {
    setEditingTagId(tag.id);
    setTagDraft(tag.label);
  };

  const cancelEditTag = () => {
    setEditingTagId(null);
    setTagDraft('');
  };

  const saveTag = async (tagId) => {
    const label = tagDraft.trim();
    if (!label) return;

    setSaving(true);
    try {
      await adminUpdateTagLabel(getAdminPassword(), tagId, label);
      cancelEditTag();
      await loadTags(selectedCategoryId);
    } catch (err) {
      setError('Failed to update tag');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    const label = newTagLabel.trim();
    if (!label || !selectedCategoryId) return;

    setSaving(true);
    try {
      await adminCreateTag(getAdminPassword(), selectedCategoryId, label);
      setNewTagLabel('');
      await loadTags(selectedCategoryId);
    } catch (err) {
      setError('Failed to add tag');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    if (!window.confirm(`Delete tag "${tag.label}"?`)) return;

    setSaving(true);
    try {
      await adminDeleteTag(getAdminPassword(), tag.id);
      await loadTags(selectedCategoryId);
    } catch (err) {
      setError('Failed to delete tag');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel fade-in">
      <div className="admin-mode-toggle" role="tablist" aria-label="Manage categories or tags">
        <button
          type="button"
          role="tab"
          aria-selected={mode === MODES.categories}
          className={`admin-mode-btn ${mode === MODES.categories ? 'active' : ''}`}
          onClick={() => {
            setMode(MODES.categories);
            cancelEditCategory();
            cancelEditTag();
          }}
        >
          Manage categories
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === MODES.tags}
          className={`admin-mode-btn ${mode === MODES.tags ? 'active' : ''}`}
          onClick={() => {
            setMode(MODES.tags);
            cancelEditCategory();
            cancelEditTag();
          }}
        >
          Manage tags
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      {mode === MODES.categories && (
        <>
          {loadingCategories ? (
            <div className="admin-panel-loading">
              <div className="spinner" />
            </div>
          ) : categories.length === 0 ? (
            <div className="empty-state compact">
              <span className="empty-icon">🏷️</span>
              <h2>No categories yet</h2>
              <p>Global categories will appear here once seeded.</p>
            </div>
          ) : (
            <ul className="admin-list">
              {categories.map((category) => (
                <li key={category.id} className="admin-list-row admin-list-row--stacked">
                  <div className="admin-list-main">
                    {editingCategoryId === category.id ? (
                      <div className="admin-inline-edit">
                        <span className="admin-category-icon">{category.icon}</span>
                        <input
                          type="text"
                          className="text-input admin-inline-input"
                          value={categoryDraft}
                          onChange={(e) => setCategoryDraft(e.target.value)}
                          maxLength={40}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCategory(category.id);
                            if (e.key === 'Escape') cancelEditCategory();
                          }}
                        />
                        <button
                          type="button"
                          className="primary-btn admin-inline-btn"
                          disabled={!categoryDraft.trim() || saving}
                          onClick={() => saveCategory(category.id)}
                        >
                          Save
                        </button>
                        <button type="button" className="secondary-btn admin-inline-btn" onClick={cancelEditCategory}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="admin-editable-row"
                        onClick={() => startEditCategory(category)}
                      >
                        <span className="admin-category-icon">{category.icon}</span>
                        <span className="admin-list-title">{category.label}</span>
                        <span className="admin-edit-hint">Edit</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {mode === MODES.tags && (
        <>
          <div className="field-group">
            <label htmlFor="admin-tag-category" className="field-label">Category</label>
            <select
              id="admin-tag-category"
              className="text-input select-input"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                cancelEditTag();
                setNewTagLabel('');
              }}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {!selectedCategoryId ? (
            <p className="panel-hint">Choose a category to view and manage its tags.</p>
          ) : loadingTags ? (
            <div className="admin-panel-loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              <p className="panel-hint">
                Tags for {selectedCategory?.label}
              </p>

              <div className="admin-tag-add">
                <input
                  type="text"
                  className="text-input"
                  placeholder="New tag name"
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.target.value)}
                  maxLength={40}
                  onKeyDown={(e) => e.key === 'Enter' && newTagLabel.trim() && !saving && handleAddTag()}
                />
                <button
                  type="button"
                  className="primary-btn admin-add-btn"
                  disabled={!newTagLabel.trim() || saving}
                  onClick={handleAddTag}
                >
                  Add tag
                </button>
              </div>

              {tags.length === 0 ? (
                <div className="empty-state compact">
                  <p>No tags for this category yet.</p>
                </div>
              ) : (
                <ul className="admin-list">
                  {tags.map((tag) => (
                    <li key={tag.id} className="admin-list-row">
                      {editingTagId === tag.id ? (
                        <div className="admin-inline-edit admin-inline-edit--full">
                          <input
                            type="text"
                            className="text-input admin-inline-input"
                            value={tagDraft}
                            onChange={(e) => setTagDraft(e.target.value)}
                            maxLength={40}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTag(tag.id);
                              if (e.key === 'Escape') cancelEditTag();
                            }}
                          />
                          <button
                            type="button"
                            className="primary-btn admin-inline-btn"
                            disabled={!tagDraft.trim() || saving}
                            onClick={() => saveTag(tag.id)}
                          >
                            Save
                          </button>
                          <button type="button" className="secondary-btn admin-inline-btn" onClick={cancelEditTag}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="admin-editable-row admin-editable-row--grow"
                            onClick={() => startEditTag(tag)}
                          >
                            <span className="admin-list-title">{tag.label}</span>
                            <span className="admin-edit-hint">Edit</span>
                          </button>
                          <button
                            type="button"
                            className="delete-btn"
                            disabled={saving}
                            onClick={() => handleDeleteTag(tag)}
                            aria-label={`Delete ${tag.label}`}
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
