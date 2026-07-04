import { useId, useMemo } from 'react';
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

export default function MonthlyTrendChart({ expenses }) {
  const gradientId = useId();

  const chartData = useMemo(() => {
    const months = getLastNMonthKeys(MONTH_COUNT, monthKey(todayISO()));
    const totals = {};

    expenses.forEach((expense) => {
      const key = monthKey(expense.date);
      totals[key] = (totals[key] || 0) + expense.amount;
    });

    return months.map((month) => ({
      month,
      label: formatMonthShortLabel(month),
      amount: totals[month] || 0,
    }));
  }, [expenses]);

  const maxAmount = Math.max(...chartData.map((point) => point.amount), 1);
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const baselineY = PADDING.top + plotHeight;

  const points = chartData.map((point, index) => ({
    x:
      PADDING.left +
      (chartData.length === 1 ? plotWidth / 2 : (index / (chartData.length - 1)) * plotWidth),
    y: PADDING.top + plotHeight - (point.amount / maxAmount) * plotHeight,
    ...point,
  }));

  const linePath = buildSmoothLinePath(points);
  const areaPath = buildAreaPath(points, baselineY);

  return (
    <div className="monthly-trend-chart">
      <svg
        className="monthly-trend-svg"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        role="img"
        aria-label="Monthly expense trend over the last six months"
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

        {areaPath && <path d={areaPath} className="monthly-trend-area" fill={`url(#${gradientId})`} />}

        {linePath && (
          <path
            d={linePath}
            className="monthly-trend-line"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point) => (
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

        {points.map((point) => (
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
  );
}
