'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Error boundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', gap: 'var(--space-4)', textAlign: 'center',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: 'var(--radius-xl)',
            backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px',
          }}>
            ⚠️
          </div>
          <div>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'var(--text-xl)', marginBottom: '8px' }}>
              Something went wrong
            </h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', maxWidth: '400px' }}>
              {this.state.error?.message || 'An unexpected error occurred in this section.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px', borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-command-navy)', color: 'white',
              border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 500,
              fontFamily: 'var(--font-data)',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
