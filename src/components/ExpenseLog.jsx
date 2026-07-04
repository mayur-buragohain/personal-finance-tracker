import { useMemo, useRef, useState } from 'react';
import { deleteExpense } from '../utils/expenses';
import {
  formatDisplayDate,
  formatINR,
  formatMonthLabel,
  getExpenseTags,
  monthKey,
  resolveCategory,
  todayISO,
} from '../utils/helpers';
import ExpenseEditModal from './ExpenseEditModal';

const SWIPE_THRESHOLD = 80;

const DATE_FILTER = {
  all: 'all',
  month: 'month',
  range: 'range',
};

function normalizeDateRange(from, to) {
  if (!from && !to) {
    return { start: null, end: null };
  }

  const start = from || to;
  const end = to || from;
  return start <= end ? { start, end } : { start: end, end: start };
}

function matchesDateFilter(expense, mode, month, from, to) {
  if (mode === DATE_FILTER.all) {
    return true;
  }

  if (mode === DATE_FILTER.month) {
    return monthKey(expense.date) === month;
  }

  const { start, end } = normalizeDateRange(from, to);
  if (!start) {
    return true;
  }

  return expense.date >= start && expense.date <= end;
}

function formatDateRangeLabel(from, to) {
  const { start, end } = normalizeDateRange(from, to);
  if (!start) {
    return '';
  }
  if (start === end) {
    return formatDisplayDate(start);
  }
  return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
}

function buildFilterSummary({
  dateFilterMode,
  filterMonth,
  filterFromDate,
  filterToDate,
  filterCategoryId,
  categoryMap,
  count,
  total,
}) {
  const parts = [];

  if (dateFilterMode === DATE_FILTER.month) {
    parts.push(formatMonthLabel(filterMonth));
  } else if (dateFilterMode === DATE_FILTER.range && (filterFromDate || filterToDate)) {
    parts.push(formatDateRangeLabel(filterFromDate, filterToDate));
  }

  if (filterCategoryId) {
    const category = categoryMap[filterCategoryId];
    parts.push(category ? `${category.icon} ${category.label}` : 'Selected category');
  }

  const label = parts.length > 0 ? parts.join(' · ') : 'Filtered';
  return `${label} · ${count} expense${count === 1 ? '' : 's'} · ${formatINR(total)}`;
}

function buildEmptyFilterMessage({
  dateFilterMode,
  filterMonth,
  filterFromDate,
  filterToDate,
  filterCategoryId,
  categoryMap,
}) {
  const parts = [];

  if (dateFilterMode === DATE_FILTER.month) {
    parts.push(formatMonthLabel(filterMonth));
  } else if (dateFilterMode === DATE_FILTER.range && (filterFromDate || filterToDate)) {
    parts.push(formatDateRangeLabel(filterFromDate, filterToDate));
  }

  if (filterCategoryId) {
    const category = categoryMap[filterCategoryId];
    parts.push(category ? `${category.icon} ${category.label}` : 'this category');
  }

  if (parts.length === 0) {
    return 'No expenses match your filters.';
  }

  return `No expenses for ${parts.join(' · ')}.`;
}

export default function ExpenseLog({ profileId, expenses, categories }) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const currentMonth = monthKey(todayISO());

  const [dateFilterMode, setDateFilterMode] = useState(DATE_FILTER.all);
  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const swipeState = useRef({ id: null, startX: 0, currentX: 0 });

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map((e) => monthKey(e.date)));
    months.add(currentMonth);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentMonth]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        if (filterCategoryId && expense.categoryId !== filterCategoryId) {
          return false;
        }
        return matchesDateFilter(
          expense,
          dateFilterMode,
          filterMonth,
          filterFromDate,
          filterToDate
        );
      }),
    [expenses, dateFilterMode, filterMonth, filterFromDate, filterToDate, filterCategoryId]
  );

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );

  const hasActiveFilters =
    dateFilterMode !== DATE_FILTER.all || filterCategoryId !== '';

  const filterSummary = useMemo(
    () =>
      buildFilterSummary({
        dateFilterMode,
        filterMonth,
        filterFromDate,
        filterToDate,
        filterCategoryId,
        categoryMap,
        count: filteredExpenses.length,
        total: filteredTotal,
      }),
    [
      dateFilterMode,
      filterMonth,
      filterFromDate,
      filterToDate,
      filterCategoryId,
      categoryMap,
      filteredExpenses.length,
      filteredTotal,
    ]
  );

  const emptyFilterMessage = useMemo(
    () =>
      buildEmptyFilterMessage({
        dateFilterMode,
        filterMonth,
        filterFromDate,
        filterToDate,
        filterCategoryId,
        categoryMap,
      }),
    [dateFilterMode, filterMonth, filterFromDate, filterToDate, filterCategoryId, categoryMap]
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
      <div className="log-filters">
        <div className="field-group">
          <span className="field-label">When</span>
          <div className="log-filter-mode" role="tablist" aria-label="Filter by when">
            <button
              type="button"
              role="tab"
              aria-selected={dateFilterMode === DATE_FILTER.all}
              className={`log-filter-mode-btn ${dateFilterMode === DATE_FILTER.all ? 'active' : ''}`}
              onClick={() => setDateFilterMode(DATE_FILTER.all)}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dateFilterMode === DATE_FILTER.month}
              className={`log-filter-mode-btn ${dateFilterMode === DATE_FILTER.month ? 'active' : ''}`}
              onClick={() => setDateFilterMode(DATE_FILTER.month)}
            >
              Month
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={dateFilterMode === DATE_FILTER.range}
              className={`log-filter-mode-btn ${dateFilterMode === DATE_FILTER.range ? 'active' : ''}`}
              onClick={() => setDateFilterMode(DATE_FILTER.range)}
            >
              Range
            </button>
          </div>
        </div>

        {dateFilterMode === DATE_FILTER.month && (
          <div className="field-group">
            <label htmlFor="log-month-filter" className="field-label">
              Month
            </label>
            <select
              id="log-month-filter"
              className="text-input select-input"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {formatMonthLabel(month)}
                </option>
              ))}
            </select>
          </div>
        )}

        {dateFilterMode === DATE_FILTER.range && (
          <div className="log-filter-range">
            <div className="field-group">
              <label htmlFor="log-from-date" className="field-label">
                From
              </label>
              <input
                id="log-from-date"
                type="date"
                className="text-input"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
              />
            </div>
            <div className="field-group">
              <label htmlFor="log-to-date" className="field-label">
                To
              </label>
              <input
                id="log-to-date"
                type="date"
                className="text-input"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="field-group">
          <label htmlFor="log-category-filter" className="field-label">
            Category
          </label>
          <select
            id="log-category-filter"
            className="text-input select-input"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {sortedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <p className="log-filter-summary" aria-live="polite">
            {filterSummary}
          </p>
        )}
      </div>

      {groupedExpenses.length === 0 ? (
        <div className="empty-state compact">
          <p>{emptyFilterMessage}</p>
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
                      <div className="expense-body">
                        <div className="expense-primary-line">
                          <span className="expense-category">{category.label}</span>
                          {expense.note && (
                            <>
                              <span className="expense-primary-sep" aria-hidden="true">
                                |
                              </span>
                              <span className="expense-note">{expense.note}</span>
                            </>
                          )}
                        </div>
                        <div className="expense-meta-line">
                          {expenseTags.length > 0 ? (
                            <div className="expense-tags">
                              {expenseTags.map((tag) => (
                                <span key={tag.id} className="expense-tag">
                                  {tag.label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="expense-tags expense-tags--empty" aria-hidden="true" />
                          )}
                          <div className="expense-meta-actions">
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
                              className="delete-btn expense-delete-btn"
                              aria-label="Delete expense"
                              onClick={() => handleDelete(expense)}
                              disabled={isDeleting}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
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
