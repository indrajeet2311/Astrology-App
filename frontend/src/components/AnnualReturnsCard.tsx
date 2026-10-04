import { useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { calculateAnnualCharts, errorMessage } from '../api';
import type { AnnualChartsResponse, BirthPayload, Chart } from '../types';
import { NorthIndianChart } from './NorthIndianChart';
import { PlanetTable } from './PlanetTable';
import { SouthIndianChart } from './SouthIndianChart';
import { SIGN_GLYPHS, SIGN_LORDS, SIGN_NAMES, WEEKDAY_LORDS } from '../constants';

const TITHI_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];

function tithiLord(number: number): string {
  if (number === 30) return 'Rahu';
  if (number === 15) return 'Saturn';
  return TITHI_LORDS[(((number - 1) % 15) % 8)];
}

type ReturnKind = 'varshaphal' | 'tithiPravesh';
type ChartStyle = 'north' | 'south';

export function AnnualReturnsCard({ birth, natalAscSign }: { birth: BirthPayload; natalAscSign: number }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [returns, setReturns] = useState<AnnualChartsResponse | null>(null);
  const [kind, setKind] = useState<ReturnKind>('varshaphal');
  const [style, setStyle] = useState<ChartStyle>('north');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      setReturns(await calculateAnnualCharts(birth, year));
    } catch (e) {
      setError(errorMessage(e, 'Annual chart calculation failed.'));
    } finally {
      setLoading(false);
    }
  };

  const chart: Chart | null = returns ? returns[kind] : null;
  const eventAt = returns ? returns[kind === 'varshaphal' ? 'varshaphalAt' : 'tithiPraveshAt'] : '';
  const title = kind === 'varshaphal' ? 'Varshaphal' : 'Tithi Pravesh';
  const eventTime = chart && eventAt
    ? new Date(eventAt).toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'long',
        timeZone: chart.birthDetails.timeZone,
      })
    : '';

  const weekdayLord = chart && eventAt
    ? (() => {
        const day = new Date(new Date(eventAt).toLocaleString('en-US', { timeZone: chart.birthDetails.timeZone })).getDay();
        return { name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day], lord: WEEKDAY_LORDS[day] };
      })()
    : null;
  const age = returns ? returns.year - Number(birth.date.slice(0, 4)) : 0;
  const munthaSign = ((natalAscSign - 1 + age) % 12) + 1;
  const munthaHouse = chart ? ((munthaSign - chart.ascendant.signNumber + 12) % 12) + 1 : 0;

  return (
    <section className="card annual-card">
      <div className="transit-head">
        <div>
          <h2>Annual charts</h2>
          <p className="muted small">Solar return and annual natal-tithi return at the birth location.</p>
        </div>
        <div className="annual-controls no-print">
          <label htmlFor="annual-chart-year">Return year</label>
          <input
            id="annual-chart-year"
            type="number"
            min={birth.date.slice(0, 4)}
            max="2100"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
          <button type="button" className="button-primary" disabled={loading || !year} onClick={() => void generate()}>
            {loading ? <Loader2 className="spin" size={17} /> : <CalendarDays size={17} />}
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {returns && chart && (
        <div className="annual-result" aria-live="polite">
          <div className="annual-toolbar no-print">
            <div className="segmented" role="group" aria-label="Annual chart type">
              <button type="button" aria-pressed={kind === 'varshaphal'} onClick={() => setKind('varshaphal')}>
                Varshaphal
              </button>
              <button type="button" aria-pressed={kind === 'tithiPravesh'} onClick={() => setKind('tithiPravesh')}>
                Tithi Pravesh
              </button>
            </div>
            <div className="segmented" role="group" aria-label="Annual chart style">
              <button type="button" aria-pressed={style === 'north'} onClick={() => setStyle('north')}>
                North Indian
              </button>
              <button type="button" aria-pressed={style === 'south'} onClick={() => setStyle('south')}>
                South Indian
              </button>
            </div>
          </div>
          <h3 className="annual-title">{title} · {returns.year}</h3>
          <p className="muted small">
            {eventTime} · {chart.birthDetails.placeName}
            {kind === 'tithiPravesh' ? ` · ${chart.panchang.tithi} ${chart.panchang.paksha}` : ''}
          </p>
          <div className="annual-facts">
            {kind === 'varshaphal' && (
              <div className="fact">
                <span className="muted small">Muntha (age {age})</span>
                <strong><span className="glyph" aria-hidden>{SIGN_GLYPHS[munthaSign - 1]}</span> {SIGN_NAMES[munthaSign - 1]}</strong>
                <small>House {munthaHouse} · Lord {SIGN_LORDS[munthaSign - 1]}</small>
              </div>
            )}
            {kind === 'tithiPravesh' && (
              <>
                <div className="fact">
                  <span className="muted small">Tithi lord</span>
                  <strong>{tithiLord(chart.panchang.tithiNumber)}</strong>
                  <small>{chart.panchang.paksha} {chart.panchang.tithi}</small>
                </div>
                {weekdayLord && (
                  <div className="fact">
                    <span className="muted small">Weekday lord</span>
                    <strong>{weekdayLord.lord}</strong>
                    <small>{weekdayLord.name}</small>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="annual-visual">
            {style === 'north'
              ? <NorthIndianChart chart={chart} label={`${title} · ${returns.year}`} />
              : <SouthIndianChart chart={chart} label={`${title} · ${returns.year}`} />}
            <PlanetTable bodies={[chart.ascendant, ...chart.planets]} chart={chart} />
          </div>
        </div>
      )}
    </section>
  );
}
