import { useMemo, useState } from 'react';
import {
  formatINR,
  formatDisplayDate,
  formatMonthLabel,
  formatMonthTrendLabel,
  getExpenseTags,
  monthKey,
  resolveCategory,
  todayISO,
} from '../utils/helpers';
import MonthlyTrendChart from './MonthlyTrendChart';

function buildCategoryTagBreakdown(categoryId, monthExpenses) {
  const tagTotals = {};
  let untaggedTotal = 0;
  let hasMultiTagExpense = false;

  monthExpenses
    .filter((e) => e.categoryId === categoryId)
    .forEach((expense) => {
      const tags = getExpenseTags(expense);
      if (tags.length === 0) {
        untaggedTotal += expense.amount;
        return;
      }

      if (tags.length > 1) {
        hasMultiTagExpense = true;
      }

      tags.forEach((tag) => {
        if (!tagTotals[tag.id]) {
          tagTotals[tag.id] = { id: tag.id, label: tag.label, amount: 0 };
        }
        tagTotals[tag.id].amount += expense.amount;
      });
    });

  return {
    tags: Object.values(tagTotals).sort((a, b) => b.amount - a.amount),
    untaggedTotal,
    hasMultiTagExpense,
  };
}

export default function Report({ expenses, categories }) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const currentMonth = monthKey(todayISO());

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map((e) => monthKey(e.date)));
    months.add(currentMonth);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentMonth]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  const handleMonthChange = (month) => {
    setSelectedMonth(month);
    setExpandedCategoryId(null);
  };

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
  };

  const monthExpenses = useMemo(
    () => expenses.filter((e) => monthKey(e.date) === selectedMonth),
    [expenses, selectedMonth]
  );

  const totalSpent = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses]
  );

  const categoryBreakdown = useMemo(() => {
    const totals = {};
    const meta = {};

    monthExpenses.forEach((e) => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
      if (!meta[e.categoryId]) {
        meta[e.categoryId] = resolveCategory(e, categoryMap);
      }
    });

    return Object.entries(totals)
      .map(([id, amount]) => ({
        id,
        amount,
        category: meta[id],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses, categoryMap]);

  const maxCategoryAmount = categoryBreakdown[0]?.amount || 1;

  const categoryTagBreakdowns = useMemo(() => {
    const breakdowns = {};
    categoryBreakdown.forEach(({ id }) => {
      breakdowns[id] = buildCategoryTagBreakdown(id, monthExpenses);
    });
    return breakdowns;
  }, [categoryBreakdown, monthExpenses]);

  const dayBreakdown = useMemo(() => {
    const totals = {};
    monthExpenses.forEach((e) => {
      totals[e.date] = (totals[e.date] || 0) + e.amount;
    });

    const [year, month] = selectedMonth.split('-');
    const daysInMonth = new Date(Number(year), Number(month), 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const dateStr = `${selectedMonth}-${day}`;
      return {
        date: dateStr,
        day: i + 1,
        amount: totals[dateStr] || 0,
      };
    });
  }, [monthExpenses, selectedMonth]);

  const maxDayAmount = Math.max(...dayBreakdown.map((d) => d.amount), 1);

  const topExpenses = useMemo(
    () => [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [monthExpenses]
  );

  return (
    <section className="panel report fade-in">
      <div className="field-group">
        <label htmlFor="month-select" className="field-label">Month</label>
        <select
          id="month-select"
          className="text-input select-input"
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
        >
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="report-total">
        <span className="report-total-label">Total Spent</span>
        <span className="report-total-amount">{formatINR(totalSpent)}</span>
      </div>

      {monthExpenses.length === 0 ? (
        <div className="empty-state compact">
          <span className="empty-icon">📊</span>
          <p>No expenses for this month.</p>
        </div>
      ) : (
        <>
          <div className="report-section">
            <h2 className="section-title">Month Expense by Category</h2>
            <div className="bar-chart-list">
              {categoryBreakdown.map((item) => {
                const isExpanded = expandedCategoryId === item.id;
                const tagBreakdown = categoryTagBreakdowns[item.id];
                const maxTagAmount = Math.max(
                  ...tagBreakdown.tags.map((t) => t.amount),
                  tagBreakdown.untaggedTotal,
                  1
                );

                return (
                  <div
                    key={item.id}
                    className={`bar-chart-row${isExpanded ? ' bar-chart-row-expanded' : ''}`}
                  >
                    <button
                      type="button"
                      className="bar-chart-toggle"
                      onClick={() => toggleCategoryExpand(item.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="bar-chart-header">
                        <span className="bar-chart-label">
                          <span className="bar-chart-chevron" aria-hidden="true">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          {item.category.icon} {item.category.label}
                        </span>
                        <span className="bar-chart-value">{formatINR(item.amount)}</span>
                      </div>
                      <div className="bar-track">
                        <div
                          className="bar-fill horizontal"
                          style={{
                            width: `${(item.amount / maxCategoryAmount) * 100}%`,
                            backgroundColor: item.category.color,
                          }}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bar-chart-tags">
                        {tagBreakdown.tags.map((tag) => (
                          <div key={tag.id} className="bar-chart-tag-row">
                            <div className="bar-chart-tag-info">
                              <span className="bar-chart-tag-name">{tag.label}</span>
                              <div className="bar-track bar-track-tag">
                                <div
                                  className="bar-fill horizontal"
                                  style={{
                                    width: `${(tag.amount / maxTagAmount) * 100}%`,
                                    backgroundColor: item.category.color,
                                    opacity: 0.55,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="bar-chart-tag-amount">{formatINR(tag.amount)}</span>
                          </div>
                        ))}
                        {tagBreakdown.untaggedTotal > 0 && (
                          <div className="bar-chart-tag-row">
                            <div className="bar-chart-tag-info">
                              <span className="bar-chart-tag-name bar-chart-tag-untagged">
                                Untagged
                              </span>
                              <div className="bar-track bar-track-tag">
                                <div
                                  className="bar-fill horizontal"
                                  style={{
                                    width: `${(tagBreakdown.untaggedTotal / maxTagAmount) * 100}%`,
                                    backgroundColor: 'var(--text-muted)',
                                    opacity: 0.35,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="bar-chart-tag-amount">
                              {formatINR(tagBreakdown.untaggedTotal)}
                            </span>
                          </div>
                        )}
                        {tagBreakdown.hasMultiTagExpense && (
                          <p className="tag-breakdown-hint">
                            Amounts may overlap when an expense has multiple tags.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="report-section">
            <h2 className="section-title section-title--dynamic">
              <span className="section-title-main">Daily Spend Trend for</span>
              <span className="section-title-period">{formatMonthTrendLabel(selectedMonth)}</span>
            </h2>
            <div className="day-chart-scroll">
              <div className="day-chart">
                {dayBreakdown.map((day) => (
                  <div key={day.date} className="day-bar-col" title={`${day.day}: ${formatINR(day.amount)}`}>
                    <div className="day-bar-wrap">
                      <div
                        className="bar-fill vertical"
                        style={{
                          height: day.amount > 0 ? `${(day.amount / maxDayAmount) * 100}%` : '2px',
                        }}
                      />
                    </div>
                    <span className="day-label">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="report-section">
            <h2 className="section-title">Top 5 Expenses</h2>
            <ul className="top-expenses-list">
              {topExpenses.map((expense, index) => {
                const category = resolveCategory(expense, categoryMap);
                const expenseTags = getExpenseTags(expense);

                return (
                  <li key={expense.docId} className="top-expense-row">
                    <span className="top-rank">#{index + 1}</span>
                    <div className="top-expense-body">
                      <div className="top-expense-primary">
                        <div className="top-expense-primary-text">
                          <span className="top-expense-cat">
                            {category.icon} {category.label}
                          </span>
                          {expense.note && (
                            <>
                              <span className="top-expense-sep" aria-hidden="true">
                                |
                              </span>
                              <span className="top-expense-note">{expense.note}</span>
                            </>
                          )}
                        </div>
                        <span className="top-expense-amount">{formatINR(expense.amount)}</span>
                      </div>
                      <div className="top-expense-meta">
                        <span className="top-expense-date">{formatDisplayDate(expense.date)}</span>
                        {expenseTags.length > 0 && (
                          <div className="expense-tags top-expense-tags">
                            {expenseTags.map((tag) => (
                              <span key={tag.id} className="expense-tag">
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <div className="report-section report-section--trend">
        <h2 className="section-title">Monthly Expense Trend</h2>
        <MonthlyTrendChart expenses={expenses} />
      </div>
    </section>
  );
}
