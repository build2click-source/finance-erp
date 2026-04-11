'use client';

import React, { useState, FormEvent } from 'react';
import { Landmark, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0e1629 40%, #111c3a 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-sans, Inter, sans-serif)',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(99,130,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,130,255,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Gradient orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-5%', width: '50vw', height: '50vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,91,219,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-5%', width: '40vw', height: '40vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,200,150,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left panel — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '4rem',
      }} className="login-left-panel">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '3rem' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b6adb, #5a3fbf)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(59,106,219,0.4)',
          }}>
            <Landmark size={24} color="white" />
          </div>
          <span style={{
            fontSize: '24px', fontWeight: 800, color: 'white',
            letterSpacing: '-0.03em',
          }}>CommisERP</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 3vw, 2.75rem)', fontWeight: 800, color: 'white',
          lineHeight: 1.15, letterSpacing: '-0.04em', marginBottom: '1rem',
        }}>
          Enterprise Finance,<br />
          <span style={{
            background: 'linear-gradient(90deg, #6aadff, #82e0c0)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Built for India.</span>
        </h1>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px', lineHeight: 1.7, maxWidth: '400px' }}>
          Double-entry ledger, GST-aware invoicing, FIFO inventory, and bank reconciliation — all in one place.
        </p>

        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { icon: '🔒', label: 'Role-Based Access Control' },
            { icon: '📊', label: 'Real-time Financial Reports' },
            { icon: '🧾', label: 'GST Compliant Invoicing' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '480px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }} className="login-right-panel">
        <div style={{
          width: '100%', maxWidth: '400px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '24px',
          padding: '2.5rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}>
          {/* Form header */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} color="#6aadff" />
              <span style={{ fontSize: '12px', color: '#6aadff', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Secure Access
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '6px' }}>
              Sign in to your account
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                autoComplete="username"
                autoFocus
                required
                style={{
                  width: '100%', height: '44px', padding: '0 14px',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: 'white', fontSize: '14px',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(106,173,255,0.6)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%', height: '44px', padding: '0 44px 0 14px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', color: 'white', fontSize: '14px',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(106,173,255,0.6)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.35)', padding: '4px',
                    display: 'flex', alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
              }}>
                <AlertCircle size={15} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#f87171' }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading || !username.trim() || !password}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                height: '44px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: loading ? 'rgba(59,106,219,0.5)' : 'linear-gradient(135deg, #3b6adb, #5a3fbf)',
                color: 'white', fontSize: '14px', fontWeight: 600,
                fontFamily: 'inherit',
                opacity: (!username.trim() || !password) && !loading ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(59,106,219,0.4)',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: '16px', height: '16px', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', fontSize: '12px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            Contact your administrator if you need access.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-left-panel { display: none !important; }
          .login-right-panel { width: 100% !important; }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
