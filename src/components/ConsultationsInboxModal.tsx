import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Download, Mail, Phone, Trash2, X, RefreshCw } from 'lucide-react';
import { fetchConsultations, updateConsultation, removeConsultation, getAuthToken } from '../api';
import type { ConsultationItem } from '../api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function ConsultationsInboxModal({ isOpen, onClose, onCountChange }: Props) {
  const [items, setItems] = useState<ConsultationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'contacted' | 'completed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testWebhookMsg, setTestWebhookMsg] = useState<string | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestWebhookMsg(null);
    try {
      const res = await fetch('/api/consultations/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken() || ''}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setTestWebhookMsg('✓ Test entry sent! Check your Google Sheet and indrajeetbhattacharya5@gmail.com inbox.');
      } else {
        setTestWebhookMsg('Test response: ' + (data.error || 'Check configuration'));
      }
    } catch (e: any) {
      setTestWebhookMsg('Failed: ' + e.message);
    } finally {
      setTestingWebhook(false);
      setTimeout(() => setTestWebhookMsg(null), 6000);
    }
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchConsultations();
      setItems(data.consultations);
      const pendingCount = data.consultations.filter((c) => c.status === 'pending').length;
      if (onCountChange) onCountChange(pendingCount);
    } catch (err: any) {
      setError(err?.message || 'Could not load consultation requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void load();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = async (id: string, status: 'pending' | 'contacted' | 'completed') => {
    try {
      await updateConsultation(id, status);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
      const updated = items.map((item) => (item.id === id ? { ...item, status } : item));
      const pendingCount = updated.filter((c) => c.status === 'pending').length;
      if (onCountChange) onCountChange(pendingCount);
    } catch {
      alert('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this consultation request?')) return;
    try {
      await removeConsultation(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      const updated = items.filter((item) => item.id !== id);
      const pendingCount = updated.filter((c) => c.status === 'pending').length;
      if (onCountChange) onCountChange(pendingCount);
    } catch {
      alert('Failed to delete consultation');
    }
  };

  const handleCopy = (item: ConsultationItem) => {
    const text = [
      `CONSULTATION REQUEST #${item.id}`,
      `Date: ${new Date(item.createdAt).toLocaleString()}`,
      `Client: ${item.name}`,
      `Email: ${item.email}`,
      `Phone: ${item.phone || 'N/A'}`,
      `Preferred Contact: ${item.contactMethod}`,
      `Topic: ${item.topic}`,
      `Timezone: ${item.timezone}`,
      `Availability: ${item.availability || 'Flexible'}`,
      `Birth Details: ${item.birthDate ? `${item.birthDate} ${item.birthTime || ''} at ${item.birthPlace || ''}` : 'Not shared'}`,
      '',
      'Question / Details:',
      item.question,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation_requests_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter);

  return (
    <div className="inbox-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="inbox-title">
      <div className="inbox-modal card" onClick={(e) => e.stopPropagation()}>
        <header className="inbox-header">
          <div>
            <h2 id="inbox-title">Consultation Requests Inbox</h2>
            <p className="muted small">
              All consultation submissions received through the website.
            </p>
          </div>
          <div className="inbox-actions">
            <button className="button-ghost small" onClick={load} title="Refresh" disabled={loading}>
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>
            {items.length > 0 && (
              <button className="button-ghost small" onClick={handleExportJson} title="Export JSON">
                <Download size={14} /> Export
              </button>
            )}
            <button className="icon-button" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--color-bg-secondary, rgba(255,255,255,0.04))', borderRadius: '8px', margin: '4px 0 12px', fontSize: '0.85rem', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            <span>Google Sheets &amp; Gmail alerts: <strong style={{ color: '#10b981' }}>Active</strong></span>
          </div>
          <button
            type="button"
            className="button-ghost small"
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            style={{ fontSize: '0.78rem', padding: '3px 8px' }}
          >
            {testingWebhook ? 'Sending test...' : 'Send Test Ping to Sheet'}
          </button>
        </div>
        {testWebhookMsg && (
          <div style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '10px' }}>
            {testWebhookMsg}
          </div>
        )}

        <div className="inbox-filters">
          <button
            className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({items.length})
          </button>
          <button
            className={`tab-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({items.filter((i) => i.status === 'pending').length})
          </button>
          <button
            className={`tab-btn ${filter === 'contacted' ? 'active' : ''}`}
            onClick={() => setFilter('contacted')}
          >
            Contacted ({items.filter((i) => i.status === 'contacted').length})
          </button>
          <button
            className={`tab-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({items.filter((i) => i.status === 'completed').length})
          </button>
        </div>

        {error && <div className="alert">{error}</div>}

        <div className="inbox-content">
          {loading && items.length === 0 ? (
            <div className="inbox-empty">Loading consultation requests…</div>
          ) : filtered.length === 0 ? (
            <div className="inbox-empty">
              No consultation requests found {filter !== 'all' ? `with status "${filter}"` : 'yet'}.
            </div>
          ) : (
            <div className="inbox-list">
              {filtered.map((item) => (
                <article key={item.id} className={`inbox-card status-${item.status}`}>
                  <div className="inbox-card-top">
                    <div>
                      <span className="inbox-ref">#{item.id}</span>
                      <strong className="inbox-name">{item.name}</strong>
                      <span className="inbox-time muted small">
                        <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {new Date(item.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="inbox-status-select">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as any)}
                        className={`badge-status status-${item.status}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="inbox-meta-grid">
                    <div>
                      <span className="meta-label">Topic:</span> <strong>{item.topic}</strong>
                    </div>
                    <div>
                      <span className="meta-label">Preferred:</span> {item.contactMethod === 'email' ? 'Email' : 'Phone'}
                    </div>
                    <div>
                      <span className="meta-label">Email:</span>{' '}
                      <a href={`mailto:${item.email}?subject=Regarding your consultation request (${item.topic})`}>
                        {item.email}
                      </a>
                    </div>
                    {item.phone && (
                      <div>
                        <span className="meta-label">Phone:</span>{' '}
                        <a href={`tel:${item.phone}`}>{item.phone}</a>
                      </div>
                    )}
                    {item.timezone && (
                      <div>
                        <span className="meta-label">Timezone:</span> {item.timezone}
                      </div>
                    )}
                    {item.availability && (
                      <div>
                        <span className="meta-label">Availability:</span> {item.availability}
                      </div>
                    )}
                  </div>

                  {item.birthDate && (
                    <div className="inbox-birth-box">
                      <span className="meta-label">Birth Details:</span>{' '}
                      <strong>{item.birthDate}</strong> at <strong>{item.birthTime || 'unknown time'}</strong>
                      {item.birthPlace ? ` in ${item.birthPlace}` : ''}
                    </div>
                  )}

                  <div className="inbox-question">
                    <span className="meta-label">Question:</span>
                    <p>{item.question}</p>
                  </div>

                  <div className="inbox-card-footer">
                    <div className="inbox-contact-links">
                      <a
                        href={`mailto:${item.email}?subject=Your consultation inquiry: ${encodeURIComponent(item.topic)}&body=Hello ${encodeURIComponent(item.name)},\n\nThank you for reaching out regarding your inquiry on "${encodeURIComponent(item.topic)}".`}
                        className="button-ghost small"
                      >
                        <Mail size={14} /> Email Client
                      </a>
                      {item.phone && (
                        <a href={`tel:${item.phone}`} className="button-ghost small">
                          <Phone size={14} /> Call
                        </a>
                      )}
                      <button className="button-ghost small" onClick={() => handleCopy(item)}>
                        {copiedId === item.id ? <CheckCircle2 size={14} color="#52c41a" /> : null}
                        {copiedId === item.id ? 'Copied!' : 'Copy Summary'}
                      </button>
                    </div>

                    <button
                      className="icon-button danger"
                      onClick={() => handleDelete(item.id)}
                      title="Delete request"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
