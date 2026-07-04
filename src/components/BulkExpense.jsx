import { useEffect, useMemo, useState } from 'react';
import { createExpensesBulk } from '../utils/expenses';
import { subscribeTags } from '../utils/tags';
import { formatINR, todayISO } from '../utils/helpers';
import DatePillNav from './DatePillNav';

function emptyRow() {
  return { id: crypto.randomUUID(), amount: '', categoryId: '', tagIds: [] };
}

function BulkExpenseRow({
  row,
  categories,
  onAmountChange,
  onCategoryChange,
  onToggleTag,
  onRemove,
}) {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (!row.categoryId) {
      setTags([]);
      return;
    }
    return subscribeTags(row.categoryId, setTags);
  }, [row.categoryId]);

  const categoryLabel = categories.find((c) => c.id === row.categoryId)?.label;

  return (
    <li className="bulk-row-wrap">
      <div className="bulk-row">
        <input
          type="text"
          inputMode="decimal"
          className="text-input bulk-amount-input"
          placeholder="0"
          value={row.amount}
          onChange={(e) => onAmountChange(row.id, e.target.value)}
          aria-label="Amount"
        />
        <select
          className="text-input select-input bulk-category-select"
          value={row.categoryId}
          onChange={(e) => onCategoryChange(row.id, e.target.value)}
          aria-label="Category"
        >
          <option value="">Category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="delete-btn bulk-remove-btn"
          onClick={() => onRemove(row.id)}
          aria-label="Remove row"
        >
          ✕
        </button>
      </div>

      {row.categoryId && tags.length > 0 && (
        <div className="bulk-row-tags">
          <div className="add-expense-tag-chips bulk-tag-chips" role="group" aria-label={`Tags for ${categoryLabel}`}>
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={`add-expense-tag-chip ${row.tagIds.includes(tag.id) ? 'selected' : ''}`}
                onClick={() => onToggleTag(row.id, tag.id)}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

export default function BulkExpense({ profileId, categories }) {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedCount, setSavedCount] = useState(0);

  const validRows = useMemo(
    () =>
      rows.filter((row) => {
        const amount = parseFloat(row.amount);
        return amount > 0 && row.categoryId;
      }),
    [rows]
  );

  const total = useMemo(
    () => validRows.reduce((sum, row) => sum + parseFloat(row.amount), 0),
    [validRows]
  );

  const clearStatus = () => {
    setSavedCount(0);
    setError('');
  };

  const handleAmountChange = (id, value) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, amount: value } : row)));
      clearStatus();
    }
  };

  const handleCategoryChange = (id, categoryId) => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, categoryId, tagIds: [] } : row))
    );
    clearStatus();
  };

  const handleToggleTag = (id, tagId) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const tagIds = row.tagIds.includes(tagId)
          ? row.tagIds.filter((x) => x !== tagId)
          : [...row.tagIds, tagId];
        return { ...row, tagIds };
      })
    );
    clearStatus();
  };

  const addRow = () => {
    setRows((prev) => [...prev, emptyRow()]);
    clearStatus();
  };

  const removeRow = (id) => {
    setRows((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((row) => row.id !== id)));
    clearStatus();
  };

  const handleSubmit = async () => {
    if (validRows.length === 0) return;

    setSaving(true);
    setError('');
    setSavedCount(0);

    try {
      const count = validRows.length;
      await createExpensesBulk(
        profileId,
        validRows.map((row) => ({
          amount: parseFloat(row.amount),
          categoryId: row.categoryId,
          date,
          tagIds: row.tagIds,
        }))
      );
      setRows([emptyRow()]);
      setSavedCount(count);
      setTimeout(() => setSavedCount(0), 2500);
    } catch (err) {
      setError('Failed to save expenses. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = validRows.length > 0 && !saving;

  const submitLabel = saving
    ? 'Saving…'
    : validRows.length > 0
      ? `✓ Submit ${validRows.length} expense${validRows.length !== 1 ? 's' : ''}`
      : 'Submit';

  return (
    <section className="bulk-expense fade-in">
      <div className="bulk-expense-header">
        <DatePillNav
          id="bulk-date"
          date={date}
          onChange={(value) => {
            setDate(value);
            clearStatus();
          }}
        />
      </div>

      <div className="bulk-expense-section">
        <div className="bulk-rows-header" aria-hidden="true">
          <span>Amount</span>
          <span>Category</span>
          <span />
        </div>

        <ul className="bulk-rows">
          {rows.map((row) => (
            <BulkExpenseRow
              key={row.id}
              row={row}
              categories={categories}
              onAmountChange={handleAmountChange}
              onCategoryChange={handleCategoryChange}
              onToggleTag={handleToggleTag}
              onRemove={removeRow}
            />
          ))}
        </ul>

        <div className="bulk-add-row-bar">
          <button
            type="button"
            className="add-expense-tag-chip add-expense-tag-chip--new bulk-add-row"
            onClick={addRow}
          >
            + Add row
          </button>
        </div>
      </div>

      <div className="bulk-expense-actions">
        {validRows.length > 0 && (
          <p className="bulk-total">
            <strong>{formatINR(total)}</strong>
            <span className="bulk-total-count">
              · {validRows.length} expense{validRows.length !== 1 ? 's' : ''}
            </span>
          </p>
        )}

        {error && <p className="field-error">{error}</p>}
        {savedCount > 0 && (
          <p className="success-toast" role="status">
            {savedCount} expense{savedCount !== 1 ? 's' : ''} saved
          </p>
        )}

        <button
          type="button"
          className="primary-btn add-expense-save"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </section>
  );
}
