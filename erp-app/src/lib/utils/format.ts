/**
 * Shared formatting utilities.
 * Single source of truth for currency, dates, and number formatting.
 */

// ── Currency ──────────────────────────────────────────────────────────────────

/** Format a number as Indian Rupees (₹) */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a decimal/Prisma Decimal as INR */
export function formatDecimalINR(value: unknown): string {
  return formatINR(Number(value ?? 0));
}

// ── Date ──────────────────────────────────────────────────────────────────────

/** Format an ISO date string as locale date (e.g. "11 Apr 2026") */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Returns "YYYY-MM-DD" string for an input[type="date"] */
export function toInputDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().split('T')[0];
}

// ── Numbers ───────────────────────────────────────────────────────────────────

/** Format a percentage (e.g. 18 → "18%") */
export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${Number(value).toFixed(2)}%`;
}

/** Safe conversion of Prisma Decimal or unknown to JS number */
export function toNumber(value: unknown): number {
  return Number(value ?? 0);
}
