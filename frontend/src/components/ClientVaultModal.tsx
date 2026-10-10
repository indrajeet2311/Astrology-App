import { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  Trash2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { formatDate } from '../format';
import type { BirthPayload } from '../types';
import type { AuthUser, CloudSavedChart, ConsultationItem } from '../api';
import {
  fetchCloudCharts,
  deleteCloudChart,
  syncLocalChartsToCloud,
  fetchUserConsultations,
  logoutUser
} from '../api';
import { loadSavedCharts } from '../savedCharts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onOpenChart: (payload: BirthPayload) => void;
  onLogout: () => void;
}

const RELATION_LABELS: Record<CloudSavedChart['relationship'], string> = {
  self: 'Self (My Chart)',
  spouse: 'Spouse / Partner',
  child: 'Child',
  parent: 'Parent',
  partner: 'Business Partner',
  friend: 'Friend',
  client: 'Client',
  other: 'Family / Other',
};

export function ClientVaultModal({ isOpen, onClose, user, onOpenChart, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<'charts' | 'consultations'>('charts');
  const [charts, setCharts] = useState<CloudSavedChart[]>([]);
  const [consultations, setConsultations] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [filterRel, setFilterRel] = useState<string>('all');

  const localSavedCount = loadSavedCharts().length;

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cloudCharts, myInquiries] = await Promise.all([
        fetchCloudCharts().catch(() => []),
        fetchUserConsultations().catch(() => []),
      ]);
      setCharts(cloudCharts);
      setConsultations(myInquiries);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this chart from your cloud vault?')) return;
    try {
      await deleteCloudChart(id);
      setCharts((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(err.message || 'Could not delete chart.');
    }
  };

  const handleSyncLocal = async () => {
    const local = loadSavedCharts();
    if (local.length === 0) {
      setSyncMessage('No local charts found to sync.');
      return;
    }
    setSyncing(true);
    try {
      const updated = await syncLocalChartsToCloud(local);
      setCharts(updated);
      setSyncMessage(`Successfully synced ${local.length} chart(s) to your cloud vault!`);
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err: any) {
      setSyncMessage('Failed to sync local charts: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    onLogout();
    onClose();
  };

  const exportBackupJson = () => {
    if (charts.length === 0) return;
    const blob = new Blob([JSON.stringify(charts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextgenastro_vault_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const filteredCharts = filterRel === 'all'
    ? charts
    : charts.filter((c) => c.relationship === filterRel);

  return (
    <div className="inbox-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="inbox-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 840 }}>
        {/* Header */}
        <header className="inbox-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(226, 184, 87, 0.15)',
                color: 'var(--gold)'
              }}>
                <Cloud size={18} />
              </div>
              <h2 style={{ margin: 0 }}>My Astrological Cloud Vault</h2>
            </div>
            <p className="muted small" style={{ marginTop: 4 }}>
              Account: <strong>{user.name}</strong> ({user.email}) · Synced securely across all your devices
            </p>
          </div>
          <div className="inbox-actions">
            <button
              type="button"
              className="button-ghost"
              onClick={handleSignOut}
              title="Sign out of account"
              style={{ fontSize: '0.82rem', gap: 6, color: 'var(--danger)' }}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Tabs */}
        <div className="inbox-filters" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveTab('charts')}
            >
              <Sparkles size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              Saved Charts ({charts.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
              onClick={() => setActiveTab('consultations')}
            >
              <MessageSquare size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              My Consultations ({consultations.length})
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {activeTab === 'charts' && charts.length > 0 && (
              <button
                type="button"
                className="button-ghost"
                onClick={exportBackupJson}
                style={{ fontSize: '0.8rem', gap: 5 }}
                title="Download an offline JSON backup of all your vault charts"
              >
                <Download size={13} />
                <span>Backup JSON</span>
              </button>
            )}

            {activeTab === 'charts' && localSavedCount > 0 && (
              <button
                type="button"
                className="button-ghost"
                onClick={handleSyncLocal}
                disabled={syncing}
                style={{ fontSize: '0.8rem', gap: 6, color: 'var(--gold)' }}
                title="Import charts saved in this browser into your cloud vault"
              >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? 'Syncing...' : `Import Browser (${localSavedCount})`}</span>
              </button>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: 'rgba(226, 184, 87, 0.08)',
          border: '1px solid rgba(226, 184, 87, 0.25)',
          borderRadius: 8,
          color: 'var(--gold)',
          fontSize: '0.78rem',
          margin: '6px 0 10px'
        }}>
          <ShieldCheck size={14} style={{ flexShrink: 0 }} />
          <span><strong>Permanent Retention:</strong> Charts saved in your vault never expire. They are tied to your account and accessible from any device.</span>
        </div>

        {syncMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: 'rgba(82, 196, 26, 0.12)',
            border: '1px solid rgba(82, 196, 26, 0.35)',
            borderRadius: 8,
            color: '#73d13d',
            fontSize: '0.84rem',
            margin: '8px 0'
          }}>
            <CheckCircle2 size={16} />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Content */}
        <div className="inbox-content">
          {loading ? (
            <div className="inbox-empty">Loading your vault...</div>
          ) : activeTab === 'charts' ? (
            <div>
              {/* Category Filters */}
              {charts.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  <button
                    type="button"
                    className={`tab-btn ${filterRel === 'all' ? 'active' : ''}`}
                    onClick={() => setFilterRel('all')}
                    style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                  >
                    All ({charts.length})
                  </button>
                  {(['self', 'spouse', 'child', 'parent', 'partner', 'friend', 'other'] as const).map((r) => {
                    const count = charts.filter((c) => c.relationship === r).length;
                    if (count === 0) return null;
                    return (
                      <button
                        key={r}
                        type="button"
                        className={`tab-btn ${filterRel === r ? 'active' : ''}`}
                        onClick={() => setFilterRel(r)}
                        style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                      >
                        {RELATION_LABELS[r]} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredCharts.length === 0 ? (
                <div className="inbox-empty">
                  <Cloud size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>No charts saved in this view.</p>
                  <p className="muted small" style={{ marginTop: 6 }}>
                    Calculate any birth chart and click <strong>"Save Chart"</strong> to store it in your Cloud Vault.
                  </p>
                </div>
              ) : (
                <div className="inbox-list">
                  {filteredCharts.map((item) => (
                    <div key={item.id} className="inbox-card" style={{ borderLeft: '4px solid var(--gold)' }}>
                      <div className="inbox-card-top">
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: '1.15rem' }}>{item.label}</strong>
                            <span style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: 'rgba(226, 184, 87, 0.15)',
                              color: 'var(--gold)',
                              fontWeight: 600
                            }}>
                              {RELATION_LABELS[item.relationship] || item.relationship}
                            </span>
                          </div>
                          <p className="muted small" style={{ marginTop: 4 }}>
                            {formatDate(item.payload.date)} · {item.payload.time} · {item.payload.placeName}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            type="button"
                            className="button-ghost"
                            onClick={() => {
                              onOpenChart(item.payload);
                              onClose();
                            }}
                            style={{ gap: 6, fontSize: '0.84rem' }}
                          >
                            <ExternalLink size={14} />
                            <span>Open Chart</span>
                          </button>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => handleDelete(item.id)}
                            title="Remove chart from cloud vault"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {item.notes && (
                        <div style={{
                          fontSize: '0.85rem',
                          padding: '8px 12px',
                          background: 'rgba(0, 0, 0, 0.25)',
                          borderRadius: 6,
                          marginTop: 8,
                          color: '#ddd'
                        }}>
                          <span style={{ color: 'var(--muted)', marginRight: 6 }}>Notes:</span>
                          {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Consultations View for Client */}
              {consultations.length === 0 ? (
                <div className="inbox-empty">
                  <MessageSquare size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <p>You haven't submitted any consultation requests yet.</p>
                  <p className="muted small" style={{ marginTop: 6 }}>
                    When you request an astrological reading from any chart, you can track its status and astrologer notes right here.
                  </p>
                </div>
              ) : (
                <div className="inbox-list">
                  {consultations.map((c) => (
                    <div key={c.id} className={`inbox-card status-${c.status}`}>
                      <div className="inbox-card-top">
                        <div>
                          <span className="inbox-ref">#{c.id}</span>
                          <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>{c.topic}</strong>
                          <span className="muted small" style={{ marginLeft: 8 }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className={`badge-status status-${c.status}`} style={{ cursor: 'default' }}>
                          {c.status === 'pending' ? 'Pending Review' : c.status === 'contacted' ? 'Astrologer Contacted' : 'Completed'}
                        </span>
                      </div>

                      <div className="inbox-question" style={{ margin: '8px 0' }}>
                        <span className="meta-label">Your Question:</span>
                        <p>{c.question}</p>
                      </div>

                      {c.notes && (
                        <div style={{
                          padding: '10px 12px',
                          background: 'rgba(226, 184, 87, 0.08)',
                          border: '1px dashed var(--gold-dim)',
                          borderRadius: 8,
                          fontSize: '0.86rem',
                          marginTop: 8
                        }}>
                          <strong style={{ color: 'var(--gold)', display: 'block', marginBottom: 2 }}>
                            Astrologer Notes & Recommendations:
                          </strong>
                          <p style={{ margin: 0, color: '#f0f0f0' }}>{c.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
