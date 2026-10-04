import { useState } from 'react';
import { Compass, Orbit, Telescope } from 'lucide-react';
import { calculateChart, errorMessage } from './api';
import { BirthForm } from './components/BirthForm';
import { ChartResults } from './components/ChartResults';
import type { BirthPayload, Chart } from './types';

export function App() {
  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <div className="page">
      <nav className="brand" aria-label="Celestia">
        <span className="brand-mark" aria-hidden>✦</span>
        <span className="brand-name">Celestia</span>
      </nav>

      <main>
        {chart ? (
          <ChartResults chart={chart} onBack={() => setChart(null)} />
        ) : (
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
        )}
      </main>
    </div>
  );
}
