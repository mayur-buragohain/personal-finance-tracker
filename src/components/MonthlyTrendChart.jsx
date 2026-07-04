import { useEffect, useId, useMemo, useState } from 'react';
import {
  formatINR,
  formatMonthShortLabel,
  getLastNMonthKeys,
  monthKey,
  todayISO,
} from '../utils/helpers';

const CHART_WIDTH = 400;
const CHART_HEIGHT = 140;
const PADDING = { top: 16, right: 12, bottom: 28, left: 12 };
const MONTH_COUNT = 6;
const CATEGORY_FADE_MS = 350;

function buildSmoothLinePath(points) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

function buildAreaPath(points, baselineY) {
  if (points.length === 0) return '';

  const linePath = buildSmoothLinePath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}

function buildMonthlySeries(expenses, months, categoryId = null) {
  const totals = {};

  expenses.forEach((expense) => {
    if (categoryId && expense.categoryId !== categoryId) return;
    const key = monthKey(expense.date);
    totals[key] = (totals[key] || 0) + expense.amount;
  });

  return months.map((month) => ({
    month,
    label: formatMonthShortLabel(month),
    amount: totals[month] || 0,
  }));
}

function toChartPoints(series, maxAmount, plotWidth, plotHeight) {
  return series.map((point, index) => ({
    x:
      PADDING.left +
      (series.length === 1 ? plotWidth / 2 : (index / (series.length - 1)) * plotWidth),
    y: PADDING.top + plotHeight - (point.amount / maxAmount) * plotHeight,
    ...point,
  }));
}

export default function MonthlyTrendChart({ expenses, categories }) {
  const gradientId = useId();
  const compareSelectId = useId();
  const [compareCategoryId, setCompareCategoryId] = useState('');
  const [displayCategoryId, setDisplayCategoryId] = useState('');
  const [categoryVisible, setCategoryVisible] = useState(false);

  const months = useMemo(
    () => getLastNMonthKeys(MONTH_COUNT, monthKey(todayISO())),
    []
  );

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.label.localeCompare(b.label)),
    [categories]
  );

  const totalSeries = useMemo(
    () => buildMonthlySeries(expenses, months),
    [expenses, months]
  );

  const categorySeries = useMemo(() => {
    if (!displayCategoryId) return [];
    return buildMonthlySeries(expenses, months, displayCategoryId);
  }, [expenses, months, displayCategoryId]);

  const maxAmount = useMemo(() => {
    const values = [
      ...totalSeries.map((point) => point.amount),
      ...categorySeries.map((point) => point.amount),
    ];
    return Math.max(...values, 1);
  }, [totalSeries, categorySeries]);

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY = PADDING.top + plotHeight;

  const totalPoints = toChartPoints(totalSeries, maxAmount, plotWidth, plotHeight);
  const categoryPoints = toChartPoints(categorySeries, maxAmount, plotWidth, plotHeight);

  const totalLinePath = buildSmoothLinePath(totalPoints);
  const totalAreaPath = buildAreaPath(totalPoints, baselineY);
  const categoryLinePath = buildSmoothLinePath(categoryPoints);

  const compareCategory = sortedCategories.find((cat) => cat.id === displayCategoryId);

  useEffect(() => {
    if (compareCategoryId) {
      setDisplayCategoryId(compareCategoryId);
      const frame = requestAnimationFrame(() => setCategoryVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setCategoryVisible(false);
    const timer = setTimeout(() => setDisplayCategoryId(''), CATEGORY_FADE_MS);
    return () => clearTimeout(timer);
  }, [compareCategoryId]);

  const chartLabel = compareCategory
    ? `Monthly expense trend with ${compareCategory.label} comparison`
    : 'Monthly expense trend over the last six months';

  return (
    <div className="monthly-trend-section">
      <div className="monthly-trend-header">
        <h2 className="section-title">Monthly Expense Trend</h2>
        <div className="monthly-trend-compare">
          <label htmlFor={compareSelectId} className="monthly-trend-compare-label">
            Compare with:
          </label>
          <select
            id={compareSelectId}
            className="monthly-trend-compare-select text-input select-input"
            value={compareCategoryId}
            onChange={(e) => setCompareCategoryId(e.target.value)}
          >
            <option value="">None</option>
            {sortedCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="monthly-trend-chart">
        <svg
          className="monthly-trend-svg"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label={chartLabel}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(108, 92, 231, 0.45)" />
              <stop offset="100%" stopColor="rgba(108, 92, 231, 0)" />
            </linearGradient>
          </defs>

          <line
            x1={PADDING.left}
            y1={baselineY}
            x2={CHART_WIDTH - PADDING.right}
            y2={baselineY}
            className="monthly-trend-baseline"
          />

          {totalAreaPath && (
            <path d={totalAreaPath} className="monthly-trend-area" fill={`url(#${gradientId})`} />
          )}

          {totalLinePath && (
            <path
              d={totalLinePath}
              className="monthly-trend-line monthly-trend-line--total"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {displayCategoryId && categoryLinePath && (
            <path
              d={categoryLinePath}
              className={`monthly-trend-line monthly-trend-line--category${
                categoryVisible ? ' is-visible' : ''
              }`}
              fill="none"
              stroke={compareCategory?.color || 'var(--text-secondary)'}
              strokeWidth="1.75"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>{`${compareCategory?.label} category trend`}</title>
            </path>
          )}

          {totalPoints.map((point) => (
            <g key={point.month}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                className="monthly-trend-dot"
                aria-hidden="true"
              />
              <title>{`${formatMonthShortLabel(point.month)}: ${formatINR(point.amount)}`}</title>
            </g>
          ))}

          {totalPoints.map((point) => (
            <text
              key={`${point.month}-label`}
              x={point.x}
              y={CHART_HEIGHT - 6}
              className="monthly-trend-label"
              textAnchor="middle"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
