import { useEffect, useState } from 'react';
import { Compass, Orbit, Telescope } from 'lucide-react';
import { calculateChart, errorMessage, matchCharts } from './api';
import { BirthForm } from './components/BirthForm';
import { ChartResults } from './components/ChartResults';
import { SavedCharts } from './components/SavedCharts';
import { DailyPanchang } from './components/DailyPanchang';
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
      <nav className="brand" aria-label="Celestia">
        <span className="brand-mark" aria-hidden>✦</span>
        <span className="brand-name">Celestia</span>
      </nav>

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
                <h1>Your Vedic birth chart, calculated precisely.</h1>
                <p>
                  Enter when and where you were born to see your sidereal Rashi chart, planetary positions and
                  nakshatras.
                </p>
                <ul className="features">
                  <li><Telescope size={20} aria-hidden /><span><strong>Swiss Ephemeris</strong> planetary positions</span></li>
                  <li><Compass size={20} aria-hidden /><span><strong>Sidereal zodiac</strong> with Lahiri, Raman or KP ayanamsa</span></li>
                  <li><Orbit size={20} aria-hidden /><span><strong>North and South Indian</strong> chart styles</span></li>
                </ul>
              </section>
              <BirthForm loading={loading} error={error} onSubmit={calculate} />
            </div>
            <SavedCharts charts={savedCharts} onOpen={calculate} onDelete={remove} />
            <DailyPanchang />
          </>
        )}
      </main>
    </div>
  );
}
