import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, FileText, Link as LinkIcon, Printer, Save } from 'lucide-react';
import { AYANAMSA_LABEL, SIGN_GLYPHS } from '../constants';
import { formatDate } from '../format';
import { chartFromAscendantSign, divisionalChart } from '../divisional';
import { birthTiming } from '../birthTiming';
import type { BirthPayload, Chart, KundliMatch } from '../types';
import { DashaTimeline } from './DashaTimeline';
import { AnnualReturnsCard } from './AnnualReturnsCard';
import { InsightsCard } from './InsightsCard';
import { PersonalityCard } from './PersonalityCard';
import { AshtakavargaCard } from './AshtakavargaCard';
import { ShadbalaCard, VimshopakaCard } from './ShadbalaCard';
import { JaiminiCard } from './JaiminiCard';
import { AvasthaCard } from './AvasthaCard';
import { CollapsibleSection } from './CollapsibleSection';
import { SaturnCyclesCard } from './SaturnCyclesCard';
import { TransitCalendarCard } from './TransitCalendarCard';
import { AskCard } from './AskCard';
import { ConsultationRequestForm } from './ConsultationRequestForm';
import { YearAheadCard } from './YearAheadCard';
import { jaiminiYogas } from '../jaiminiYogas';
import { ArticlesTab } from './ArticlesTab';
import { PanchangCard } from './PanchangCard';
import { TransitsCard } from './TransitsCard';
import { NorthIndianChart } from './NorthIndianChart';
import { PlanetTable } from './PlanetTable';
import { SouthIndianChart } from './SouthIndianChart';
import { KundliMatchCard } from './KundliMatchCard';
import { payloadFromChart } from '../savedCharts';
import type { SaveResult, SavedChart } from '../savedCharts';
import { downloadChartAsPng } from '../exportChartPng';

type Style = 'north' | 'south';
type ResultsTab = 'birth' | 'compatibility' | 'ask' | 'consultation' | 'articles';
type BirthSection = 'overview' | 'analysis' | 'predictive';
type DashaSystem = 'Vimshottari' | 'Yogini' | 'Chara';
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
  const [activeTab, setActiveTab] = useState<ResultsTab>('birth');
  const [birthSection, setBirthSection] = useState<BirthSection>('overview');
  const [division, setDivision] = useState<Division>('D1');
  const [viewAscSign, setViewAscSign] = useState<number | null>(null);
  const [dashaSystem, setDashaSystem] = useState<DashaSystem>('Vimshottari');
  const [saveMessage, setSaveMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const shown = useMemo(() => divisionalChart(chart, division), [chart, division]);
  const chartView = useMemo(() => chartFromAscendantSign(shown, viewAscSign ?? shown.ascendant.signNumber), [shown, viewAscSign]);
  const jaimini = useMemo(() => jaiminiYogas(chart), [chart]);
  const birthSun = useMemo(() => birthTiming(chart), [chart]);
  const divisionName = DIVISIONS.find((item) => item.code === division)?.name ?? 'Rashi';
  const label = `${divisionName} · ${division}`;
  const dashaPeriods = dashaSystem === 'Yogini' ? chart.yoginiDashas
    : dashaSystem === 'Chara' ? chart.charaDashas : chart.dashas;
  const { birthDetails: b, ascendant } = chart;
  useEffect(() => setViewAscSign(null), [chart]);
  const moon = chart.planets.find((p) => p.name === 'Moon');
  const sun = chart.planets.find((p) => p.name === 'Sun');

  const summary = [
    { label: 'Lagna (Ascendant)', value: ascendant.sign, sign: ascendant.signNumber, detail: `${ascendant.nakshatra} · pada ${ascendant.pada}` },
    { label: 'Moon sign (Rashi)', value: moon?.sign, sign: moon?.signNumber, detail: moon ? `${moon.nakshatra} · pada ${moon.pada}` : '' },
    { label: 'Sun sign', value: sun?.sign, sign: sun?.signNumber, detail: sun ? `${sun.nakshatra} · pada ${sun.pada}` : '' },
  ];

  const exportChart = async () => {
    setExportError('');
    try {
      const activeDiv = DIVISIONS.find((d) => d.code === division);
      await downloadChartAsPng({
        chart: chartView,
        division,
        divisionName: activeDiv ? activeDiv.name : division,
        style,
      });
    } catch {
      setExportError('Could not export the chart image. Use Print to save as PDF.');
    }
  };

  const exportPdf = () => {
    const previous = document.title;
    document.title = `NextGenAstro - ${b.name || 'chart'} - ${b.date}`;
    window.addEventListener('afterprint', () => { document.title = previous; }, { once: true });
    window.print();
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
          <button type="button" className="button-ghost" onClick={() => void onShare(chart).then(() => { setExportError(''); setSaveMessage('Share link copied to clipboard.'); }).catch(() => setExportError('Could not copy the share link.'))}>
            <LinkIcon size={17} /> Share link
          </button>
          <button type="button" className="button-ghost" onClick={exportPdf}>
            <FileText size={17} /> PDF
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

      <nav className="results-tabs no-print" role="tablist" aria-label="Chart sections">
        {([
          ['birth', 'Birth Details'],
          ['compatibility', 'Compatibility'],
          ['ask', 'Ask Your Chart'],
          ['consultation', 'Consultation'],
          ['articles', 'Articles'],
        ] as [ResultsTab, string][]).map(([id, title]) => (
          <button
            key={id}
            id={`results-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`results-panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
          >
            {title}
          </button>
        ))}
      </nav>

      {activeTab === 'ask' && <section id="results-panel-ask" role="tabpanel" aria-labelledby="results-tab-ask">
        <AskCard chart={chart} />
      </section>}

      {activeTab === 'consultation' && <section id="results-panel-consultation" role="tabpanel" aria-labelledby="results-tab-consultation">
        <header className="panel-intro">
          <span className="eyebrow">Private guidance</span>
          <h2>Consultation with an astrologer</h2>
          <p className="muted">Send a focused request with your preferred contact method and availability.</p>
        </header>
        <ConsultationRequestForm chart={chart} />
      </section>}

      {activeTab === 'birth' && <section id="results-panel-birth" role="tabpanel" aria-labelledby="results-tab-birth">
      <nav className="birth-subtabs no-print" role="tablist" aria-label="Birth chart sections">
        {([
          ['overview', 'Overview'],
          ['analysis', 'Chart Analysis'],
          ['predictive', 'Predictive'],
        ] as [BirthSection, string][]).map(([id, title]) => (
          <button
            key={id}
            id={`birth-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={birthSection === id}
            aria-controls={`birth-panel-${id}`}
            tabIndex={birthSection === id ? 0 : -1}
            onClick={() => setBirthSection(id)}
          >
            {title}
          </button>
        ))}
      </nav>
      {birthSection === 'overview' && <section id="birth-panel-overview" role="tabpanel" aria-labelledby="birth-tab-overview">
      <header className="panel-intro">
        <span className="eyebrow">Your chart</span>
        <h2>Birth details and planetary positions</h2>
        <p className="muted">Review your Rashi chart, birth Panchang and the placements used throughout the reading.</p>
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
              <select aria-label="Divisional chart" value={division} onChange={(event) => { setDivision(event.target.value as Division); setViewAscSign(null); }}>
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
            <NorthIndianChart chart={chartView} label={label} onHouseSelect={(sign) => setViewAscSign(sign === shown.ascendant.signNumber ? null : sign)} />
          ) : (
            <SouthIndianChart chart={chartView} label={label} onHouseSelect={(sign) => setViewAscSign(sign === shown.ascendant.signNumber ? null : sign)} />
          )}
          {viewAscSign !== null && <p className="house-view-note muted small" role="status">
            Viewing from {chartView.ascendant.sign}. House numbers have been recounted from this sign; your natal chart is unchanged.
            <button type="button" className="button-ghost" onClick={() => setViewAscSign(null)}>Reset to natal Lagna</button>
          </p>}
          <p className="muted small">
            Whole-sign houses. Click any house to view the chart from that sign. {style === 'north' ? 'Numbers show the sign in each house; house 1 is the top diamond.' : 'Signs are fixed; the highlighted box holds the Ascendant.'}{' '}
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
            <dt>Place</dt>
            <dd>{b.placeName}</dd>
            {birthSun && <>
              <dt>Sunrise / sunset</dt>
              <dd>{birthSun.sunrise} / {birthSun.sunset} local time · Vedic day beginning {formatDate(birthSun.dayDate)}</dd>
              <dt>Birth Hora</dt>
              <dd>{birthSun.hora} Hora{birthSun.horaStart ? ` · ${birthSun.horaStart}–${birthSun.horaEnd}` : ''} local time</dd>
              <dt>Vara (weekday)</dt>
              <dd>{birthSun.weekday} · ruled by {birthSun.weekdayLord}</dd>
            </>}
          </dl>
          <details className="inline-details">
            <summary>Technical calculation details</summary>
            <dl className="details">
              <dt>Universal time</dt>
              <dd>{b.utcTime.replace('T', ' ').replace('Z', ' UTC')}</dd>
              <dt>Coordinates</dt>
              <dd>{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</dd>
              <dt>Timezone</dt>
              <dd>{b.timeZone} · UTC{b.utcOffset}{birthSun ? ` · ${birthSun.timezoneLabel}${birthSun.daylightSaving ? ' (daylight saving)' : ''}` : ''}</dd>
              {birthSun && <>
                <dt>Daylight saving</dt>
                <dd>{birthSun.daylightSaving ? `In effect at birth; offset ${birthSun.offset} was applied automatically` : `Not in effect at birth; offset ${birthSun.offset} was applied`}</dd>
                {b.laterOffset && <><dt>Repeated local time</dt><dd>Later daylight-saving clock occurrence selected</dd></>}
              </>}
              <dt>Ayanamsa</dt>
              <dd>{AYANAMSA_LABEL[b.ayanamsa]} ({b.ayanamsaDegrees.toFixed(4)}°)</dd>
              <dt>House system</dt>
              <dd>{b.houseSystem === 'EQUAL' ? 'Equal house' : 'Whole sign'}</dd>
              <dt>Lunar node</dt>
              <dd>{b.trueNode ? 'True node' : 'Mean node'}</dd>
            </dl>
          </details>
        </section>
      </div>

      <PersonalityCard chart={chart} />

      <PanchangCard panchang={chart.panchang} moon={moon} />

      <section className="card">
        <h2>{division === 'D1' ? 'Planetary positions (D1)' : `Planetary positions (${division})`}</h2>
        {division !== 'D1' && <p className="muted small">Sign and whole-sign house placements for the selected division.</p>}
        <PlanetTable bodies={[chartView.ascendant, ...chartView.planets]} division={division} chart={chart} />
      </section>
      </section>}

      {birthSection === 'analysis' && <section id="birth-panel-analysis" role="tabpanel" aria-labelledby="birth-tab-analysis">
      <header className="panel-intro">
        <span className="eyebrow">Chart interpretation</span>
        <h2>Strengths, patterns and planetary states</h2>
        <p className="muted">Explore yogas and doshas, Jaimini indicators, Ashtakavarga, Shadbala and divisional strength.</p>
      </header>
      <InsightsCard aspects={chart.aspects} yogas={chart.yogas} jaimini={jaimini} />

      <CollapsibleSection title="Ashtakavarga" description="A point map of which signs support your transits best. Optional deep-dive.">
        <AshtakavargaCard chart={chart} />
      </CollapsibleSection>

      <CollapsibleSection title="Shadbala (six-fold strength)" description="Numeric strength scores astrologers use to rank your planets. Optional deep-dive.">
        <ShadbalaCard chart={chart} />
      </CollapsibleSection>

      <CollapsibleSection title="Vimshopaka Bala" description="A divisional-chart strength score. Optional deep-dive.">
        <VimshopakaCard chart={chart} />
      </CollapsibleSection>

      <CollapsibleSection title="Jaimini: Karakas, Karakamsha and Arudhas" description="Soul-indicator points from the Jaimini system. Optional deep-dive.">
        <JaiminiCard chart={chart} />
      </CollapsibleSection>

      <CollapsibleSection title="Planetary states (Avasthas) and Gandanta" description="Finer-grained condition of each planet. Optional deep-dive.">
        <AvasthaCard chart={chart} />
      </CollapsibleSection>
      </section>}

      {birthSection === 'predictive' && <section id="birth-panel-predictive" role="tabpanel" aria-labelledby="birth-tab-predictive">
      <header className="panel-intro">
        <span className="eyebrow">Timing and cycles</span>
        <h2>How the next periods unfold</h2>
        <p className="muted">Annual outlook, planetary periods and current or historical transits from this birth chart.</p>
      </header>
      <YearAheadCard chart={chart} />
      <h2 className="tab-section-title">Timing and transits</h2>
      <TransitsCard
        chart={chart}
        natal={chart.planets}
        transits={chart.transits}
        timeZone={b.timeZone}
        loading={transitLoading}
        error={transitError}
        onDateChange={onTransitDateChange}
      />

      <AnnualReturnsCard birth={payloadFromChart(chart)} natalAscSign={chart.ascendant.signNumber} />

      <SaturnCyclesCard chart={chart} />

      <TransitCalendarCard chart={chart} />

      <section className="card">
        <div className="card-head dasha-head">
          <h2>{dashaSystem} Dasha</h2>
          <div className="segmented no-print" role="group" aria-label="Dasha system">
            {(['Vimshottari', 'Yogini', 'Chara'] as const).map((system) => (
              <button key={system} type="button" aria-pressed={dashaSystem === system} onClick={() => setDashaSystem(system)}>
                {system}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small">
          {dashaSystem === 'Vimshottari'
            ? '120-year planetary cycle from the Moon’s nakshatra. First period is balanced at birth.'
            : dashaSystem === 'Yogini'
              ? '36-year, eight-Yogini cycle from the Moon’s birth nakshatra. First period is balanced at birth.'
              : 'K.N. Rao-style sign sequence: odd-sign Ascendant moves zodiacally, even-sign Ascendant reverses. Duration counts to the classical sign lord; same-sign ruler gives 12 years.'}{' '}
          Each period expands through Antardasha and Pratyantardasha. Year length is 365.25 days.
        </p>
        <DashaTimeline dashas={dashaPeriods} system={dashaSystem} />
      </section>
      </section>}
      </section>}

      {activeTab === 'compatibility' && <section id="results-panel-compatibility" role="tabpanel" aria-labelledby="results-tab-compatibility">
        <KundliMatchCard chart={chart} savedCharts={savedCharts} onMatch={onMatch} />
      </section>}

      {activeTab === 'articles' && <section id="results-panel-articles" role="tabpanel" aria-labelledby="results-tab-articles">
        <ArticlesTab />
      </section>}

    </div>
  );
}
