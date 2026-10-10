import { useEffect, useState } from 'react';
import {
  CalendarClock,
  Cloud,
  Inbox,
  LogOut,
  MessageCircleQuestion,
  Orbit,
  ShieldCheck,
  Telescope,
  User,
  UserCheck,
} from 'lucide-react';
import {
  calculateChart,
  errorMessage,
  fetchConsultations,
  matchCharts,
  fetchCurrentUser,
  fetchCloudCharts,
  deleteCloudChart,
  syncLocalChartsToCloud,
  logoutUser,
  AuthUser,
  CloudSavedChart,
} from './api';
import { BirthForm } from './components/BirthForm';
import { ChartResults } from './components/ChartResults';
import { SavedCharts } from './components/SavedCharts';
import { DailyPanchang } from './components/DailyPanchang';
import { FestivalCalendarCard } from './components/FestivalCalendarCard';
import { ConsultationsInboxModal } from './components/ConsultationsInboxModal';
import { AuthModal } from './components/AuthModal';
import { ClientVaultModal } from './components/ClientVaultModal';
import { PwaControls } from './components/PwaControls';
import { createChartShareUrl, readSharedChartUrl } from './chartSharing';
import { loadSavedCharts, payloadFromChart, removeSavedChart, saveChart } from './savedCharts';
import type { SavedChart } from './savedCharts';
import type { BirthPayload, Chart } from './types';

export function App() {
  const [chart, setChart] = useState<Chart | null>(null);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>(loadSavedCharts);
  const [cloudCharts, setCloudCharts] = useState<CloudSavedChart[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);

  // Modals state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register' | 'admin'>('login');
  const [vaultModalOpen, setVaultModalOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitError, setTransitError] = useState('');
  const [error, setError] = useState('');
  const [pendingConsultations, setPendingConsultations] = useState(0);

  // Initial user check and chart loading
  useEffect(() => {
    const shared = readSharedChartUrl();
    if (shared) void calculate(shared);

    // Check user session
    fetchCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        if (currentUser?.role === 'admin') {
          // Only admin fetches all consultations
          fetchConsultations()
            .then((data) => {
              setPendingConsultations(data.consultations.filter((c) => c.status === 'pending').length);
            })
            .catch(() => {});
        }
        if (currentUser) {
          // Fetch user's cloud saved charts
          fetchCloudCharts()
            .then(setCloudCharts)
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const openAuth = (tab: 'login' | 'register' | 'admin' = 'login') => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser: AuthUser) => {
    setUser(authenticatedUser);
    if (authenticatedUser.role === 'admin') {
      fetchConsultations()
        .then((data) => {
          setPendingConsultations(data.consultations.filter((c) => c.status === 'pending').length);
        })
        .catch(() => {});
    }
    fetchCloudCharts()
      .then(setCloudCharts)
      .catch(() => {});
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setCloudCharts([]);
    setPendingConsultations(0);
    setInboxOpen(false);
    setVaultModalOpen(false);
  };

  const reloadCloudCharts = () => {
    if (user) {
      fetchCloudCharts().then(setCloudCharts).catch(() => {});
    }
  };

  const calculate = async (payload: BirthPayload) => {
    setLoading(true);
    setError('');
    try {
      setChart(await calculateChart(payload));
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(errorMessage(e, 'Chart calculation failed.'));
    } finally {
      setLoading(false);
    }
  };

  const save = (result: Chart) => {
    const outcome = saveChart(payloadFromChart(result));
    setSavedCharts(outcome.charts);
    return outcome;
  };

  const remove = (id: string) => setSavedCharts(removeSavedChart(id));

  const removeCloud = async (id: string) => {
    await deleteCloudChart(id);
    setCloudCharts((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSyncLocal = async () => {
    const local = loadSavedCharts();
    if (local.length > 0 && user) {
      const updated = await syncLocalChartsToCloud(local);
      setCloudCharts(updated);
    }
  };

  const refreshTransits = async (currentChart: Chart, transitDate: string) => {
    setTransitLoading(true);
    setTransitError('');
    try {
      const nextChart = await calculateChart({ ...payloadFromChart(currentChart), transitDate });
      setChart(nextChart);
    } catch (e) {
      setTransitError(errorMessage(e, 'Could not update transits.'));
    } finally {
      setTransitLoading(false);
    }
  };

  const shareChart = async (currentChart: Chart) => {
    await navigator.clipboard.writeText(createChartShareUrl(payloadFromChart(currentChart)));
  };

  return (
    <div className="page">
      <div className="brand-wrap">
        <nav className="brand" aria-label="NextGenAstro">
          <span className="brand-mark" aria-hidden>✦</span>
          <span className="brand-name">NextGen<span className="brand-accent">Astro</span></span>
        </nav>

        {/* User Navigation & Role-Based Actions */}
        <div className="user-nav-actions">
          {user?.role === 'admin' ? (
            /* ADMIN VIEW: Consultations Inbox + Admin Profile */
            <>
              <span className="badge-admin" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.78rem',
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(226, 184, 87, 0.15)',
                color: 'var(--gold)',
                fontWeight: 600,
                border: '1px solid var(--gold-dim)'
              }}>
                <ShieldCheck size={14} />
                Astrologer Admin
              </span>

              <button
                className="inbox-nav-btn"
                onClick={() => setInboxOpen(true)}
                title="View Consultation Requests"
              >
                <Inbox size={16} />
                <span>Consultations</span>
                {pendingConsultations > 0 && (
                  <span className="inbox-badge">{pendingConsultations}</span>
                )}
              </button>

              <button
                type="button"
                className="button-ghost"
                onClick={handleLogout}
                title="Sign out of Admin session"
                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
              >
                <LogOut size={14} style={{ marginRight: 4 }} />
                <span>Exit Admin</span>
              </button>
            </>
          ) : user ? (
            /* CLIENT VIEW: Cloud Vault + User Profile */
            <>
              <button
                type="button"
                className="inbox-nav-btn"
                onClick={() => setVaultModalOpen(true)}
                title="Open your Astrological Cloud Vault"
                style={{ borderColor: 'var(--gold-dim)' }}
              >
                <Cloud size={16} style={{ color: 'var(--gold)' }} />
                <span>My Vault</span>
                <span className="inbox-badge" style={{ background: 'var(--gold)', color: '#161304' }}>
                  {cloudCharts.length}
                </span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="button-ghost"
                  onClick={() => setVaultModalOpen(true)}
                  style={{ fontSize: '0.84rem', padding: '6px 10px' }}
                >
                  <UserCheck size={14} style={{ marginRight: 5, color: 'var(--gold)' }} />
                  <span>{user.name}</span>
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={handleLogout}
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </>
          ) : (
            /* GUEST VIEW: No consultations button visible! Only Client Sign In / Admin link */
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                className="button-ghost"
                onClick={() => openAuth('login')}
                style={{ fontSize: '0.85rem', gap: 6, padding: '7px 14px', borderRadius: 999 }}
              >
                <User size={15} />
                <span>Sign In / Vault</span>
              </button>
              <button
                type="button"
                className="button-ghost"
                onClick={() => openAuth('admin')}
                title="Astrologer Admin Access"
                style={{ fontSize: '0.78rem', color: 'var(--gold)', padding: '6px 10px' }}
              >
                <ShieldCheck size={13} style={{ marginRight: 4 }} />
                <span>Astrologer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Admin Consultation Inbox Modal (Only if admin) */}
      {user?.role === 'admin' && (
        <ConsultationsInboxModal
          isOpen={inboxOpen}
          onClose={() => setInboxOpen(false)}
          onCountChange={setPendingConsultations}
        />
      )}

      {/* Client Vault Modal (Saved Charts & Client Inquiries) */}
      {user && (
        <ClientVaultModal
          isOpen={vaultModalOpen}
          onClose={() => setVaultModalOpen(false)}
          user={user}
          onOpenChart={calculate}
          onLogout={handleLogout}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        initialTab={authInitialTab}
      />

      <PwaControls />

      <main>
        {chart ? (
          <ChartResults
            chart={chart}
            onBack={() => setChart(null)}
            onSave={save}
            savedCharts={savedCharts}
            onMatch={(groom) => matchCharts(payloadFromChart(chart), groom)}
            onShare={shareChart}
            onTransitDateChange={(date) => refreshTransits(chart, date)}
            transitLoading={transitLoading}
            transitError={transitError}
            user={user}
            onRequestAuth={() => openAuth('login')}
            onCloudSaveSuccess={reloadCloudCharts}
          />
        ) : (
          <>
            <div className="landing">
              <section className="intro">
                <span className="eyebrow">Vedic Astrology</span>
                <h1>Understand your life through your birth chart.</h1>
                <p>
                  Enter your birth details and get an accurate Vedic chart in seconds. Then ask simple questions about
                  marriage, career, property, relationships, spirituality and health, and get clear answers, not jargon.
                </p>
                <ul className="features">
                  <li><MessageCircleQuestion size={20} aria-hidden /><span><strong>Ask anything</strong> about marriage, career, property and more, with likely timing</span></li>
                  <li><Telescope size={20} aria-hidden /><span><strong>Precise calculations</strong> with exact planetary coordinates, dashas and house cusps</span></li>
                  <li><CalendarClock size={20} aria-hidden /><span><strong>Plan ahead</strong> with planetary periods, Sade Sati, transits and a festival calendar</span></li>
                  <li><Orbit size={20} aria-hidden /><span><strong>Your way</strong>: North or South Indian charts and 16 divisional charts</span></li>
                </ul>
                <ol className="steps">
                  <li><strong>1</strong><span>Enter your birth details</span></li>
                  <li><strong>2</strong><span>See your chart explained</span></li>
                  <li><strong>3</strong><span>Ask your questions</span></li>
                </ol>
                <p className="muted small">
                  Your charts can be stored in your private Cloud Vault or kept in your local browser.
                </p>
              </section>
              <BirthForm loading={loading} error={error} onSubmit={calculate} />
            </div>

            <SavedCharts
              charts={savedCharts}
              cloudCharts={cloudCharts}
              user={user}
              onOpen={calculate}
              onDelete={remove}
              onDeleteCloud={removeCloud}
              onRequestAuth={() => openAuth('register')}
              onSyncLocal={handleSyncLocal}
            />

            <DailyPanchang />
            <FestivalCalendarCard />
          </>
        )}
      </main>
    </div>
  );
}
