import { useMemo, useState } from 'react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { calculateAnnualCharts, errorMessage } from '../api';
import type { AnnualChartsResponse, BirthPayload, Chart } from '../types';
import { NorthIndianChart } from './NorthIndianChart';
import { PlanetTable } from './PlanetTable';
import { SouthIndianChart } from './SouthIndianChart';
import { SIGN_GLYPHS, SIGN_LORDS, SIGN_NAMES, WEEKDAY_LORDS } from '../constants';
import { divisionalChart } from '../divisional';
import { birthTiming } from '../birthTiming';

const TITHI_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu'];

function tithiLord(number: number): string {
  if (number === 30) return 'Rahu';
  if (number === 15) return 'Saturn';
  return TITHI_LORDS[(((number - 1) % 15) % 8)];
}

type ReturnKind = 'varshaphal' | 'tithiPravesh';
type ChartStyle = 'north' | 'south';
const DIVISIONS = [
  { code: 'D1', name: 'Rashi' },
  { code: 'D7', name: 'Saptamsa' },
  { code: 'D9', name: 'Navamsa' },
  { code: 'D10', name: 'Dasamsa' },
] as const;
type Division = (typeof DIVISIONS)[number]['code'];

export function AnnualReturnsCard({ birth, natalAscSign }: { birth: BirthPayload; natalAscSign: number }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [returns, setReturns] = useState<AnnualChartsResponse | null>(null);
  const [kind, setKind] = useState<ReturnKind>('varshaphal');
  const [style, setStyle] = useState<ChartStyle>('north');
  const [division, setDivision] = useState<Division>('D1');
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
  const horaTiming = kind === 'tithiPravesh' && chart ? birthTiming(chart) : null;
  const shown = useMemo(() => (chart ? divisionalChart(chart, division) : null), [chart, division]);
  const divisionName = DIVISIONS.find((item) => item.code === division)?.name ?? 'Rashi';

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
            <label className="division-select">
              <span className="sr-only">Divisional chart</span>
              <select aria-label="Divisional chart" value={division} onChange={(event) => setDivision(event.target.value as Division)}>
                {DIVISIONS.map((item) => (
                  <option key={item.code} value={item.code}>{item.code} · {item.name}</option>
                ))}
              </select>
            </label>
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
                {horaTiming && (
                  <div className="fact">
                    <span className="muted small">Hora lord</span>
                    <strong>{horaTiming.hora}</strong>
                    <small>{horaTiming.horaStart ? `${horaTiming.horaStart}–${horaTiming.horaEnd}` : ''}</small>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="annual-visual">
            <h3 className="annual-title">{divisionName} chart ({division})</h3>
            {shown && (style === 'north'
              ? <NorthIndianChart chart={shown} label={`${title} · ${returns.year} · ${division}`} />
              : <SouthIndianChart chart={shown} label={`${title} · ${returns.year} · ${division}`} />)}
            {shown && <PlanetTable bodies={[shown.ascendant, ...shown.planets]} division={division} chart={chart} />}
          </div>
        </div>
      )}
    </section>
  );
}
