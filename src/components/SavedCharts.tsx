import { Trash2, Cloud, Sparkles, RefreshCw, Download, ShieldCheck } from 'lucide-react';
import { formatDate } from '../format';
import type { BirthPayload } from '../types';
import type { SavedChart } from '../savedCharts';
import type { AuthUser, CloudSavedChart } from '../api';

interface Props {
  charts: SavedChart[];
  cloudCharts?: CloudSavedChart[];
  user: AuthUser | null;
  onOpen: (payload: BirthPayload) => void;
  onDelete: (id: string) => void;
  onDeleteCloud?: (id: string) => void;
  onRequestAuth?: () => void;
  onSyncLocal?: () => void;
}

const RELATION_TAGS: Record<string, string> = {
  self: 'Self',
  spouse: 'Spouse',
  child: 'Child',
  parent: 'Parent',
  partner: 'Partner',
  friend: 'Friend',
  client: 'Client',
  other: 'Family',
};

export function SavedCharts({
  charts,
  cloudCharts = [],
  user,
  onOpen,
  onDelete,
  onDeleteCloud,
  onRequestAuth,
  onSyncLocal,
}: Props) {
  const totalCount = user ? cloudCharts.length : charts.length;

  const exportBackupJson = () => {
    const dataToExport = user && cloudCharts.length > 0 ? cloudCharts : charts;
    if (dataToExport.length === 0) return;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextgenastro_saved_charts_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="card saved-charts" aria-labelledby="saved-charts-title">
      <div className="saved-charts-head">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 id="saved-charts-title" style={{ margin: 0 }}>
              {user ? 'My Saved Charts' : 'Saved charts'}
            </h2>
            {user ? (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(226, 184, 87, 0.15)',
                color: 'var(--gold)',
                fontWeight: 600
              }}>
                <Cloud size={12} />
                Cloud Synced
              </span>
            ) : (
              <span className="muted small">Stored in this browser only</span>
            )}
          </div>
          <p className="muted small" style={{ marginTop: 4 }}>
            {user
              ? `Account: ${user.name} (${user.email}) · Access from any phone or computer`
              : 'Stored in this browser only. Create an account to save them to your private cloud vault.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!user && onRequestAuth && (
            <button
              type="button"
              className="button-ghost"
              onClick={onRequestAuth}
              style={{ fontSize: '0.8rem', gap: 6, color: 'var(--gold)', borderColor: 'var(--gold-dim)' }}
            >
              <Sparkles size={13} />
              <span>Sign In to Sync</span>
            </button>
          )}

          {user && charts.length > 0 && onSyncLocal && (
            <button
              type="button"
              className="button-ghost"
              onClick={onSyncLocal}
              style={{ fontSize: '0.78rem', gap: 5, color: 'var(--gold)' }}
              title="Import browser-stored charts into your cloud vault"
            >
              <RefreshCw size={12} />
              <span>Import Local ({charts.length})</span>
            </button>
          )}

          <span className="muted small" style={{ fontWeight: 600 }}>{totalCount}</span>
        </div>
      </div>

      {user ? (
        // Logged-in Cloud View
        cloudCharts.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p className="muted saved-empty">Your cloud vault is empty. Calculate any chart above and click <strong>"Save Chart"</strong>.</p>
            {charts.length > 0 && onSyncLocal && (
              <button
                type="button"
                className="button-primary"
                onClick={onSyncLocal}
                style={{ marginTop: 12, fontSize: '0.85rem' }}
              >
                Import {charts.length} Chart{charts.length > 1 ? 's' : ''} from this Browser to Cloud
              </button>
            )}
          </div>
        ) : (
          <ul className="saved-chart-list">
            {cloudCharts.map(({ id, label, relationship, notes, payload }) => (
              <li className="saved-chart-row" key={id}>
                <div className="saved-chart-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{label || payload.name || payload.placeName}</strong>
                    <span style={{
                      fontSize: '0.72rem',
                      padding: '1px 6px',
                      borderRadius: 4,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: 'var(--gold)',
                      fontWeight: 600
                    }}>
                      {RELATION_TAGS[relationship] || relationship}
                    </span>
                  </div>
                  <small>
                    {formatDate(payload.date)} · {payload.time} · {payload.placeName}
                    {notes && <span style={{ color: '#aaa', marginLeft: 8 }}>· Note: {notes}</span>}
                  </small>
                </div>
                <div className="saved-chart-actions">
                  <button type="button" className="button-ghost" onClick={() => onOpen(payload)}>
                    Open
                  </button>
                  {onDeleteCloud && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete saved chart for ${label || payload.name}`}
                      title="Delete chart from cloud vault"
                      onClick={() => onDeleteCloud(id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        // Anonymous Local View
        charts.length === 0 ? (
          <p className="muted saved-empty">No charts saved yet. Calculate a chart above and save it.</p>
        ) : (
          <ul className="saved-chart-list">
            {charts.map(({ id, payload }) => (
              <li className="saved-chart-row" key={id}>
                <div className="saved-chart-info">
                  <strong>{payload.name || payload.placeName}</strong>
                  <small>{formatDate(payload.date)} · {payload.time} · {payload.placeName}</small>
                </div>
                <div className="saved-chart-actions">
                  <button type="button" className="button-ghost" onClick={() => onOpen(payload)}>
                    Open
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Delete saved chart for ${payload.name || payload.placeName}`}
                    title="Delete saved chart"
                    onClick={() => onDelete(id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      <div style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: '1px solid var(--card-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
          <span><strong>Permanent Retention:</strong> Your saved charts do not expire and will remain saved indefinitely.</span>
        </div>
        {totalCount > 0 && (
          <button
            type="button"
            className="button-ghost"
            onClick={exportBackupJson}
            style={{ fontSize: '0.76rem', padding: '4px 10px', gap: 5 }}
            title="Download an offline JSON backup of all your saved charts"
          >
            <Download size={13} />
            <span>Backup (JSON)</span>
          </button>
        )}
      </div>
    </section>
  );
}
