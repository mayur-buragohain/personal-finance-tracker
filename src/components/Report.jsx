import { useMemo, useState } from 'react';
import { formatINR, formatDisplayDate, formatMonthLabel, monthKey, resolveCategory, todayISO } from '../utils/helpers';

export default function Report({ expenses, categories }) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const currentMonth = monthKey(todayISO());

  const availableMonths = useMemo(() => {
    const months = new Set(expenses.map((e) => monthKey(e.date)));
    months.add(currentMonth);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [expenses, currentMonth]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

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
          onChange={(e) => setSelectedMonth(e.target.value)}
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
            <h2 className="section-title">By Category</h2>
            <div className="bar-chart-list">
              {categoryBreakdown.map((item) => (
                <div key={item.id} className="bar-chart-row">
                  <div className="bar-chart-header">
                    <span className="bar-chart-label">
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
                </div>
              ))}
            </div>
          </div>

          <div className="report-section">
            <h2 className="section-title">Daily Spending</h2>
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
                return (
                  <li key={expense.docId} className="top-expense-row">
                    <span className="top-rank">#{index + 1}</span>
                    <div className="top-expense-info">
                      <span className="top-expense-cat">
                        {category.icon} {category.label}
                      </span>
                      <span className="top-expense-date">{formatDisplayDate(expense.date)}</span>
                    </div>
                    <span className="top-expense-amount">{formatINR(expense.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
