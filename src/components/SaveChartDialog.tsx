import { useState } from 'react';
import { X, Cloud, Bookmark, Sparkles, User, Tag } from 'lucide-react';
import type { BirthPayload } from '../types';
import type { AuthUser, CloudSavedChart } from '../api';
import { saveCloudChart } from '../api';
import { saveChart as saveLocalChart } from '../savedCharts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payload: BirthPayload;
  user: AuthUser | null;
  onSaved: (message: string) => void;
  onRequestAuth: () => void;
}

const RELATION_OPTIONS = [
  { value: 'self', label: 'Self (My Birth Chart)' },
  { value: 'spouse', label: 'Spouse / Partner' },
  { value: 'child', label: 'Child (Son / Daughter)' },
  { value: 'parent', label: 'Parent (Mother / Father)' },
  { value: 'partner', label: 'Business Partner' },
  { value: 'friend', label: 'Friend' },
  { value: 'client', label: 'Client' },
  { value: 'other', label: 'Other Family / Person' },
] as const;

export function SaveChartDialog({
  isOpen,
  onClose,
  payload,
  user,
  onSaved,
  onRequestAuth,
}: Props) {
  const [label, setLabel] = useState(payload.name || payload.placeName || 'My Chart');
  const [relationship, setRelationship] = useState<CloudSavedChart['relationship']>('self');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Always update local storage
    const localOutcome = saveLocalChart(payload);

    if (user) {
      try {
        await saveCloudChart({
          payload,
          label: label.trim() || payload.name || payload.placeName,
          relationship,
          notes: notes.trim(),
        });
        onSaved('Chart saved to your Cloud Vault and synced across devices.');
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to save to cloud.');
      } finally {
        setSaving(false);
      }
    } else {
      // Guest mode
      setSaving(false);
      onSaved(localOutcome.message || 'Chart saved locally in this browser.');
      onClose();
    }
  };

  return (
    <div className="inbox-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inbox-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <header className="inbox-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bookmark size={18} style={{ color: 'var(--gold)' }} />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Save Birth Chart</h2>
            </div>
            <p className="muted small" style={{ marginTop: 2 }}>
              {payload.date} · {payload.time} · {payload.placeName}
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>

        {user ? (
          <form onSubmit={handleSave} className="form" style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'rgba(226, 184, 87, 0.08)',
              border: '1px solid var(--gold-dim)',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: 'var(--gold)',
              marginBottom: 12
            }}>
              <Cloud size={16} />
              <span>Saving to cloud account: <strong>{user.email}</strong></span>
            </div>

            <div className="field">
              <label>Chart Name / Label</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. My Natal Chart or Ananya"
                  style={{ width: '100%', paddingLeft: 34 }}
                />
                <User size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="field">
              <label>Relationship / Category</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as any)}
                  style={{ width: '100%', paddingLeft: 34 }}
                >
                  {RELATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Tag size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              </div>
            </div>

            <div className="field">
              <label>Personal Astrological Notes <span className="optional">(optional)</span></label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Jupiter Mahadasha starts late 2026; favorable for job transition"
                style={{ width: '100%' }}
              />
            </div>

            {error && <p className="hint-error small">{error}</p>}

            <div className="dialog-actions">
              <button type="button" className="button-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="button-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save to Vault'}
              </button>
            </div>
          </form>
        ) : (
          <div style={{ padding: '16px 0' }}>
            <div style={{
              padding: '14px 16px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--card-border)',
              borderRadius: 10,
              marginBottom: 16
            }}>
              <p style={{ fontSize: '0.92rem', marginBottom: 8 }}>
                Saving this chart will keep it in your current browser session.
              </p>
              <p className="muted small">
                To sync your charts permanently across your phone, tablet, and computer, sign in or create a free client account.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  saveLocalChart(payload);
                  onSaved('Chart saved in this browser.');
                  onClose();
                }}
              >
                Save in this Browser Only
              </button>
              <button
                type="button"
                className="button-ghost"
                onClick={() => {
                  onClose();
                  onRequestAuth();
                }}
                style={{ color: 'var(--gold)', borderColor: 'var(--gold-dim)' }}
              >
                <Sparkles size={14} style={{ marginRight: 6 }} />
                Sign In to Save in Cloud Vault
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
