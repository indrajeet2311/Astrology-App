import { useMemo, useState } from 'react';
import { ArrowLeft, Download, Link as LinkIcon, Printer, Save } from 'lucide-react';
import { AYANAMSA_LABEL, SIGN_GLYPHS } from '../constants';
import { formatDate } from '../format';
import { divisionalChart } from '../divisional';
import type { BirthPayload, Chart, KundliMatch } from '../types';
import { DashaTimeline } from './DashaTimeline';
import { InsightsCard } from './InsightsCard';
import { PanchangCard } from './PanchangCard';
import { TransitsCard } from './TransitsCard';
import { NorthIndianChart } from './NorthIndianChart';
import { PlanetTable } from './PlanetTable';
import { SouthIndianChart } from './SouthIndianChart';
import { KundliMatchCard } from './KundliMatchCard';
import type { SaveResult, SavedChart } from '../savedCharts';
import { toPng } from 'html-to-image';

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

export function ChartResults({ chart, onBack, onSave, savedCharts, onMatch, onTransitDateChange, transitLoading, transitError, onShare }: {
  chart: Chart;
  onBack: () => void;
  onSave: (chart: Chart) => SaveResult;
  savedCharts: SavedChart[];
  onMatch: (groom: BirthPayload) => Promise<KundliMatch>;
  onTransitDateChange: (date: string) => void;
  transitLoading: boolean;
  transitError: string;
  onShare: (chart: Chart) => Promise<void>;
}) {
  const [style, setStyle] = useState<Style>('north');
  const [division, setDivision] = useState<Division>('D1');
  const [saveMessage, setSaveMessage] = useState('');
  const [exportError, setExportError] = useState('');
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

  const exportChart = async () => {
    const node = document.querySelector<HTMLElement>('.chart-card');
    if (!node) return;
    setExportError('');
    try {
      const image = await toPng(node, { pixelRatio: 2, backgroundColor: '#14173a' });
      const link = document.createElement('a');
      link.download = `celestia-${division.toLowerCase()}-${b.date}.png`;
      link.href = image;
      link.click();
    } catch {
      setExportError('Could not export the chart image. Use Print to save as PDF.');
    }
  };

  return (
    <div className="results">
      <div className="toolbar no-print">
        <button type="button" className="button-ghost" onClick={onBack}>
          <ArrowLeft size={17} /> Edit details
        </button>
        <div className="toolbar-actions">
          <button type="button" className="button-ghost" onClick={() => setSaveMessage(onSave(chart).message ?? '')}>
            <Save size={17} /> Save chart
          </button>
          <button type="button" className="button-ghost" onClick={exportChart}>
            <Download size={17} /> PNG
          </button>
          <button type="button" className="button-ghost" onClick={() => void onShare(chart).catch(() => setExportError('Could not copy the share link.'))}>
            <LinkIcon size={17} /> Share link
          </button>
          <button type="button" className="button-ghost" onClick={() => window.print()}>
            <Printer size={17} /> Print
          </button>
        </div>
      </div>
      {saveMessage && <p className="save-message muted small" role="status">{saveMessage}</p>}
      <p className="share-note muted small no-print">Share links contain the birth details needed to recreate the chart. Share only with someone you trust.</p>
      {exportError && <p className="save-message hint-error small" role="alert">{exportError}</p>}

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
            <dt>House system</dt>
            <dd>{b.houseSystem === 'EQUAL' ? 'Equal house' : 'Whole sign'}</dd>
            <dt>Lunar node</dt>
            <dd>{b.trueNode ? 'True node' : 'Mean node'}</dd>
          </dl>
        </section>
      </div>

      <PanchangCard panchang={chart.panchang} moon={moon} />

      <section className="card">
        <h2>{division === 'D1' ? 'Planetary positions (D1)' : `Planetary positions (${division})`}</h2>
        {division !== 'D1' && <p className="muted small">Sign and whole-sign house placements for the selected division.</p>}
        <PlanetTable bodies={[shown.ascendant, ...shown.planets]} division={division} />
      </section>

      <InsightsCard aspects={chart.aspects} yogas={chart.yogas} />

      <KundliMatchCard chart={chart} savedCharts={savedCharts} onMatch={onMatch} />

      <TransitsCard
        natal={chart.planets}
        transits={chart.transits}
        timeZone={b.timeZone}
        loading={transitLoading}
        error={transitError}
        onDateChange={onTransitDateChange}
      />

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
