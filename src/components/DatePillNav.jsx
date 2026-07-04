import { useCallback, useRef } from 'react';
import { addDaysISO, formatDatePill } from '../utils/helpers';

export default function DatePillNav({ id, date, onChange }) {
  const dateInputRef = useRef(null);

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

  const shiftDate = (days) => {
    onChange(addDaysISO(date, days));
  };

  return (
    <div className="date-pill-nav">
      <button
        type="button"
        className="date-shift-btn"
        onClick={() => shiftDate(-1)}
        aria-label="Previous day"
      >
        ‹
      </button>
      <label htmlFor={id} className="date-pill" onClick={openDatePicker}>
        <span className="date-pill-text">{formatDatePill(date)}</span>
        <input
          ref={dateInputRef}
          id={id}
          type="date"
          className="date-pill-input date-input"
          value={date}
          onChange={(e) => onChange(e.target.value)}
          onClick={openDatePicker}
          aria-label="Expense date"
        />
      </label>
      <button
        type="button"
        className="date-shift-btn"
        onClick={() => shiftDate(1)}
        aria-label="Next day"
      >
        ›
      </button>
    </div>
  );
}
