import { useMemo, useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { AYANAMSA_LABEL, SIGN_GLYPHS } from '../constants';
import { formatDate } from '../format';
import { divisionalChart } from '../divisional';
import type { Chart } from '../types';
import { DashaTimeline } from './DashaTimeline';
import { InsightsCard } from './InsightsCard';
import { PanchangCard } from './PanchangCard';
import { TransitsCard } from './TransitsCard';
import { NorthIndianChart } from './NorthIndianChart';
import { PlanetTable } from './PlanetTable';
import { SouthIndianChart } from './SouthIndianChart';

type Style = 'north' | 'south';
const DIVISIONS = [
  { code: 'D1', name: 'Rashi' },
  { code: 'D2', name: 'Hora' },
  { code: 'D3', name: 'Drekkana' },
  { code: 'D4', name: 'Chaturthamsa' },
  { code: 'D7', name: 'Saptamsa' },
  { code: 'D9', name: 'Navamsa' },
  { code: 'D10', name: 'Dasamsa' },
  { code: 'D12', name: 'Dwadashamsa' },
  { code: 'D16', name: 'Shodashamsa' },
  { code: 'D20', name: 'Vimshamsa' },
  { code: 'D24', name: 'Chaturvimshamsa' },
  { code: 'D27', name: 'Saptavimshamsa' },
  { code: 'D30', name: 'Trimsamsa' },
  { code: 'D40', name: 'Khavedamsa' },
  { code: 'D45', name: 'Akshavedamsa' },
  { code: 'D60', name: 'Shashtiamsa' },
] as const;
type Division = (typeof DIVISIONS)[number]['code'];

export function ChartResults({ chart, onBack }: { chart: Chart; onBack: () => void }) {
  const [style, setStyle] = useState<Style>('north');
  const [division, setDivision] = useState<Division>('D1');
  const shown = useMemo(() => divisionalChart(chart, division), [chart, division]);
  const divisionName = DIVISIONS.find((item) => item.code === division)?.name ?? 'Rashi';
  const label = `${divisionName} · ${division}`;
  const { birthDetails: b, ascendant } = chart;
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const sun = chart.planets.find((p) => p.name === 'Sun');

  const summary = [
    { label: 'Lagna (Ascendant)', value: ascendant.sign, sign: ascendant.signNumber, detail: ascendant.nakshatra },
    { label: 'Moon sign (Rashi)', value: moon?.sign, sign: moon?.signNumber, detail: moon ? `${moon.nakshatra} · pada ${moon.pada}` : '' },
    { label: 'Sun sign', value: sun?.sign, sign: sun?.signNumber, detail: sun?.nakshatra ?? '' },
  ];

  return (
    <div className="results">
      <div className="toolbar no-print">
        <button type="button" className="button-ghost" onClick={onBack}>
          <ArrowLeft size={17} /> Edit details
        </button>
        <button type="button" className="button-ghost" onClick={() => window.print()}>
          <Printer size={17} /> Print
        </button>
      </div>

      <header className="result-head">
        <span className="eyebrow">Vedic birth chart</span>
        <h1>{b.name || 'Your chart'}</h1>
        <p>
          {formatDate(b.date)} · {b.localTime} (UTC{b.utcOffset}) · {b.placeName}
        </p>
      </header>

      <section className="summary" aria-label="Chart summary">
        {summary.map((s) => (
          <div className="card summary-item" key={s.label}>
            <span className="muted">{s.label}</span>
            <strong>
              <span className="glyph" aria-hidden>
                {s.sign ? SIGN_GLYPHS[s.sign - 1] : ''}
              </span>{' '}
              {s.value}
            </strong>
            <small>{s.detail}</small>
          </div>
        ))}
      </section>

      <div className="results-grid">
        <section className="card chart-card">
          <div className="card-head">
            <h2>{divisionName} chart ({division})</h2>
            <label className="division-select no-print">
              <span className="sr-only">Divisional chart</span>
              <select aria-label="Divisional chart" value={division} onChange={(event) => setDivision(event.target.value as Division)}>
                {DIVISIONS.map((item) => (
                  <option key={item.code} value={item.code}>{item.code} · {item.name}</option>
                ))}
              </select>
            </label>
            <div className="segmented no-print" role="group" aria-label="Chart style">
              <button type="button" aria-pressed={style === 'north'} onClick={() => setStyle('north')}>
                North Indian
              </button>
              <button type="button" aria-pressed={style === 'south'} onClick={() => setStyle('south')}>
                South Indian
              </button>
            </div>
          </div>
          {style === 'north' ? (
            <NorthIndianChart chart={shown} label={label} />
          ) : (
            <SouthIndianChart chart={shown} label={label} />
          )}
          <p className="muted small">
            Whole-sign houses. {style === 'north' ? 'Numbers show the sign in each house; house 1 is the top diamond.' : 'Signs are fixed; the highlighted box holds the Ascendant.'}{' '}
            ℞ marks retrograde. Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter · Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu.
          </p>
        </section>

        <section className="card">
          <h2>Birth details</h2>
          <dl className="details">
            <dt>Date</dt>
            <dd>{formatDate(b.date)}</dd>
            <dt>Local time</dt>
            <dd>{b.localTime} (UTC{b.utcOffset})</dd>
            <dt>Universal time</dt>
            <dd>{b.utcTime.replace('T', ' ').replace('Z', ' UTC')}</dd>
            <dt>Place</dt>
            <dd>{b.placeName}</dd>
            <dt>Coordinates</dt>
            <dd>{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</dd>
            <dt>Timezone</dt>
            <dd>{b.timeZone}</dd>
            <dt>Ayanamsa</dt>
            <dd>{AYANAMSA_LABEL[b.ayanamsa]} ({b.ayanamsaDegrees.toFixed(4)}°)</dd>
          </dl>
        </section>
      </div>

      <PanchangCard panchang={chart.panchang} moon={moon} />

      <section className="card">
        <h2>Planetary positions</h2>
        <PlanetTable bodies={[ascendant, ...chart.planets]} />
      </section>

      <InsightsCard aspects={chart.aspects} yogas={chart.yogas} />

      <TransitsCard natal={chart.planets} transits={chart.transits} />

      <section className="card">
        <h2>Vimshottari Dasha</h2>
        <p className="muted small">
          120-year planetary periods from the Moon's nakshatra. The first period began before birth; the balance at
          birth is what remained. Year length is 365.25 days.
        </p>
        <DashaTimeline dashas={chart.dashas} />
      </section>

      <p className="disclaimer">
        Positions are computed with the Swiss Ephemeris (Moshier mode, sidereal zodiac, mean lunar node). Astrology is a
        traditional interpretive system and is not scientifically established; nothing here is medical, legal, financial
        or safety advice.
      </p>
    </div>
  );
}
