'use client';

import React from 'react';

/* ============================================================
   BUTTON COMPONENT
   ============================================================ */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const buttonStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-command-navy)',
    color: 'var(--text-inverse)',
    border: 'none',
    boxShadow: 'var(--shadow-sm)',
  },
  secondary: {
    backgroundColor: 'var(--surface-container)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
    boxShadow: 'var(--shadow-xs)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  destructive: {
    backgroundColor: 'var(--color-danger)',
    color: 'var(--text-inverse)',
    border: 'none',
    boxShadow: 'var(--shadow-sm)',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-xs)', height: '32px' },
  md: { padding: '8px 16px', fontSize: 'var(--text-sm)', height: '36px' },
  lg: { padding: '10px 20px', fontSize: 'var(--text-base)', height: '40px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-data)',
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all var(--transition-fast)',
        whiteSpace: 'nowrap',
        ...buttonStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

/* ============================================================
   INPUT COMPONENT
   ============================================================ */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, icon, style, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {label && (
          <label
            style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '6px',
              fontFamily: 'var(--font-data)',
            }}
          >
            {label}
            {required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <div style={{ position: 'absolute', left: '12px', color: 'var(--text-tertiary)', display: 'flex' }}>
              {icon}
            </div>
          )}
          <input
            ref={ref}
            style={{
              display: 'flex',
              height: '40px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              border: error ? '1px solid var(--color-danger)' : '1px solid var(--border-default)',
              backgroundColor: props.disabled ? 'var(--surface-container-low)' : 'var(--surface-container)',
              padding: '8px 12px',
              paddingLeft: icon ? '38px' : '12px',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-data)',
              color: props.disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
              transition: 'all var(--transition-fast)',
              outline: 'none',
              cursor: props.disabled ? 'not-allowed' : 'text',
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger)', marginTop: '4px' }}>
            {error}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/* ============================================================
   SELECT COMPONENT
   ============================================================ */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}

export function Select({ label, options, required, style, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '6px',
            fontFamily: 'var(--font-data)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
        </label>
      )}
      <select
        style={{
          display: 'flex',
          height: '40px',
          width: '100%',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-container)',
          padding: '8px 12px',
          fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-data)',
          color: 'var(--text-primary)',
          transition: 'all var(--transition-fast)',
          outline: 'none',
          cursor: 'pointer',
          ...style,
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================
   TEXTAREA COMPONENT
   ============================================================ */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function Textarea({ label, style, ...props }: TextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            marginBottom: '6px',
            fontFamily: 'var(--font-data)',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        style={{
          width: '100%',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-container)',
          padding: '8px 12px',
          fontSize: 'var(--text-sm)',
          fontFamily: 'var(--font-data)',
          color: 'var(--text-primary)',
          transition: 'all var(--transition-fast)',
          outline: 'none',
          resize: 'none',
          ...style,
        }}
        {...props}
      />
    </div>
  );
}

/* ============================================================
   CARD COMPONENT
   ============================================================ */
interface CardProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  padding?: boolean;
  onClick?: () => void;
}

export function Card({ children, style, className, padding = true, onClick }: CardProps) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-xl)',
        backgroundColor: 'var(--surface-container)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        ...(padding ? { padding: 'var(--space-6)' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   BADGE COMPONENT
   ============================================================ */
type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

const badgeColors: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--surface-container-high)', color: 'var(--text-secondary)' },
  success: { bg: 'var(--color-success-light)', color: 'var(--color-success-dark)' },
  warning: { bg: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
  danger: { bg: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' },
  info: { bg: 'var(--color-info-light)', color: 'var(--color-info)' },
};

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  const colors = badgeColors[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        fontFamily: 'var(--font-data)',
        backgroundColor: colors.bg,
        color: colors.color,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ============================================================
   SECTION HEADER
   ============================================================ */
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-6)',
      }}
    >
      <div>
        <h2
          className="font-display"
          style={{
            fontSize: 'var(--text-2xl)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 'var(--leading-tight)',
          }}
        >
          {title}
        </h2>
        {description && (
          <p
            style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--text-tertiary)',
              marginTop: 'var(--space-1)',
            }}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   STAT CARD (KPI)
   ============================================================ */
interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean | null;
  icon: React.ReactNode;
}

export function StatCard({ label, value, trend, trendUp, icon }: StatCardProps) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-tertiary)' }}>{label}</span>
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
      </div>
      <div
        className="font-display"
        style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      {trend && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-1)' }}>
          <span
            style={{
              fontWeight: 500,
              marginRight: '4px',
              color:
                trendUp === true
                  ? 'var(--color-success)'
                  : trendUp === false
                  ? 'var(--color-danger)'
                  : 'var(--color-warning)',
            }}
          >
            {trend}
          </span>
          from last period
        </p>
      )}
    </Card>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--surface-container)',
          border: '1px solid var(--border-subtle)',
          padding: 'var(--space-6)',
          borderRadius: 'var(--radius-2xl)',
          marginBottom: 'var(--space-6)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {icon}
      </div>
      <h2
        className="font-display"
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', maxWidth: '400px' }}>{description}</p>
      {action && <div style={{ marginTop: 'var(--space-8)' }}>{action}</div>}
    </div>
  );
}

/* ============================================================
   SKELETON LOADER
   ============================================================ */
interface SkeletonProps {
  /** Width — e.g. '100%', '200px' */
  width?: string | number;
  /** Height — e.g. '16px', '40px' */
  height?: string | number;
  borderRadius?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = '16px', borderRadius = 'var(--radius-md)', style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--surface-container-high) 25%, var(--border-subtle) 50%, var(--surface-container-high) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite',
        ...style,
      }}
    />
  );
}

/** Shorthand: a card-width block of stacked skeleton rows */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Header row */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border-subtle)' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height="12px" width="60%" />
        ))}
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height="14px" width={c === 0 ? '80%' : c === cols - 1 ? '50%' : '70%'} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   CONFIRM MODAL  (replaces window.confirm)
   ============================================================ */
interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  const accentColor =
    variant === 'danger' ? 'var(--color-danger)' :
    variant === 'warning' ? 'var(--color-command-amber)' :
    'var(--color-command-navy)';

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        animation: 'fade-in 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-container)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          padding: '2rem',
          width: '100%',
          maxWidth: '420px',
          animation: 'scale-in 0.15s ease',
        }}
      >
        {/* Accent bar */}
        <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: accentColor, marginBottom: '1.25rem' }} />
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {title}
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              height: '36px', padding: '0 16px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)', backgroundColor: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontFamily: 'var(--font-data)', fontSize: 'var(--text-sm)', fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              height: '36px', padding: '0 16px', borderRadius: 'var(--radius-md)',
              border: 'none', backgroundColor: accentColor,
              color: 'white', cursor: 'pointer',
              fontFamily: 'var(--font-data)', fontSize: 'var(--text-sm)', fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
