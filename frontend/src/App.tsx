import { useEffect, useState } from 'react';
import { CalendarClock, MessageCircleQuestion, Orbit, Telescope } from 'lucide-react';
import { calculateChart, errorMessage, matchCharts } from './api';
import { BirthForm } from './components/BirthForm';
import { ChartResults } from './components/ChartResults';
import { SavedCharts } from './components/SavedCharts';
import { DailyPanchang } from './components/DailyPanchang';
import { FestivalCalendarCard } from './components/FestivalCalendarCard';
import { PwaControls } from './components/PwaControls';
import { createChartShareUrl, readSharedChartUrl } from './chartSharing';
import { loadSavedCharts, payloadFromChart, removeSavedChart, saveChart } from './savedCharts';
import type { SavedChart } from './savedCharts';
import type { BirthPayload, Chart } from './types';

export function App() {
  const [chart, setChart] = useState<Chart | null>(null);
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>(loadSavedCharts);
  const [loading, setLoading] = useState(false);
  const [transitLoading, setTransitLoading] = useState(false);
  const [transitError, setTransitError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const shared = readSharedChartUrl();
    if (shared) void calculate(shared);
  }, []);

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
      <nav className="brand" aria-label="NextGenAstro">
        <span className="brand-mark" aria-hidden>✦</span>
        <span className="brand-name">NextGen<span className="brand-accent">Astro</span></span>
        <span className="brand-tag">Your birth chart, in plain words</span>
      </nav>
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
          />
        ) : (
          <>
            <div className="landing">
              <section className="intro">
                <span className="eyebrow">Vedic astrology, in plain language</span>
                <h1>Understand your life through your birth chart.</h1>
                <p>
                  Enter your birth details and get an accurate Vedic chart in seconds. Then ask simple questions about
                  marriage, career, property, relationships, spirituality and health, and get clear answers, not jargon.
                </p>
                <ul className="features">
                  <li><MessageCircleQuestion size={20} aria-hidden /><span><strong>Ask anything</strong> about marriage, career, property and more, with likely timing</span></li>
                  <li><Telescope size={20} aria-hidden /><span><strong>Precise positions</strong> from the Swiss Ephemeris, the standard used by professional astrologers</span></li>
                  <li><CalendarClock size={20} aria-hidden /><span><strong>Plan ahead</strong> with planetary periods, Sade Sati, transits and a festival calendar</span></li>
                  <li><Orbit size={20} aria-hidden /><span><strong>Your way</strong>: North or South Indian charts and 16 divisional charts</span></li>
                </ul>
                <ol className="steps">
                  <li><strong>1</strong><span>Enter your birth details</span></li>
                  <li><strong>2</strong><span>See your chart explained</span></li>
                  <li><strong>3</strong><span>Ask your questions</span></li>
                </ol>
                <p className="muted small">Your details stay in your browser unless you share a link. Saved charts are never uploaded.</p>
              </section>
              <BirthForm loading={loading} error={error} onSubmit={calculate} />
            </div>
            <SavedCharts charts={savedCharts} onOpen={calculate} onDelete={remove} />
            <DailyPanchang />
            <FestivalCalendarCard />
          </>
        )}
      </main>
    </div>
  );
}
