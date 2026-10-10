import React, { useState } from 'react';
import { X, Lock, Mail, User, KeyRound, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';
import { loginWithEmail, registerClient, loginWithAdminPasskey, AuthUser } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  initialTab?: 'login' | 'register' | 'admin';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialTab = 'login' }: Props) {
  const [tab, setTab] = useState<'login' | 'register' | 'admin'>(initialTab);
  
  // Register fields
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Admin passkey field
  const [passkey, setPasskey] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await registerClient(name, regEmail, regPassword);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginWithEmail(loginEmail, loginPassword);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await loginWithAdminPasskey(passkey);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Admin authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inbox-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inbox-modal auth-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <header className="inbox-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Sparkles size={18} style={{ color: 'var(--gold)' }} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>
                {tab === 'admin' ? 'Astrologer Admin Access' : tab === 'register' ? 'Create Client Account' : 'Welcome to NextGenAstro'}
              </h2>
            </div>
            <p className="muted small">
              {tab === 'admin'
                ? 'Sign in to access your consultations inbox & client management'
                : tab === 'register'
                ? 'Save your charts to the cloud and access them across all your devices'
                : 'Sign in to your private chart vault and consultation history'}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>

        <div className="inbox-filters" style={{ justifyContent: 'center', gap: 8, margin: '8px 0 16px' }}>
          <button
            type="button"
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Client Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Create Account
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'admin' ? 'active' : ''}`}
            onClick={() => { setTab('admin'); setError(''); }}
            title="Astrologer administrator portal"
          >
            <ShieldCheck size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
            Astrologer Admin
          </button>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'rgba(255, 77, 79, 0.12)',
            border: '1px solid rgba(255, 77, 79, 0.35)',
            borderRadius: 8,
            color: '#ff7875',
            fontSize: '0.85rem',
            marginBottom: 16
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Client Sign In */}
        {tab === 'login' && (
          <form onSubmit={handleLogin} className="form">
            <div className="field">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="button-primary"
                disabled={loading}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button
                type="button"
                className="button-ghost"
                style={{ fontSize: '0.82rem', padding: '4px 8px' }}
                onClick={() => { setTab('register'); setError(''); }}
              >
                Don't have an account yet? Create one for free
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Register Client */}
        {tab === 'register' && (
          <form onSubmit={handleRegister} className="form">
            <div className="field">
              <label>Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ananya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <User size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="field">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  placeholder="ananya@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <Mail size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="field">
              <label>Password <span className="optional">(at least 6 characters)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <Lock size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="button-primary"
                disabled={loading}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              >
                {loading ? 'Creating account...' : 'Create Free Account'}
              </button>
            </div>

            <p className="muted small" style={{ textAlign: 'center', marginTop: 12 }}>
              Your birth charts stay private and securely saved in your cloud vault.
            </p>
          </form>
        )}

        {/* Tab 3: Admin Passkey Portal */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="form">
            <div style={{
              padding: '12px 14px',
              background: 'rgba(226, 184, 87, 0.08)',
              border: '1px solid var(--gold-dim)',
              borderRadius: 8,
              marginBottom: 14,
              fontSize: '0.85rem'
            }}>
              <strong style={{ color: 'var(--gold)' }}>Astrologer Super Admin</strong>
              <p className="muted small" style={{ marginTop: 4 }}>
                Enter your Admin Passkey to unlock the private Consultations Inbox and review inquiries.
              </p>
            </div>

            <div className="field">
              <label>Admin Passkey / Master Secret</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter admin passkey"
                  value={passkey}
                  onChange={(e) => setPasskey(e.target.value)}
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--gold)' }} />
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="submit"
                className="button-primary"
                disabled={loading}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              >
                {loading ? 'Verifying...' : 'Unlock Admin Desk'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
