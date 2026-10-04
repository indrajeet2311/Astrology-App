import { useMemo, useState } from 'react';
import { CalendarRange, Loader2 } from 'lucide-react';
import { errorMessage, loadSlowTransits } from '../api';
import { DOMAIN_BUILDERS } from '../ask/answers';
import type { Answer, DomainId } from '../ask/answers';
import { formatRange, makeContext } from '../ask/core';
import type { Window } from '../ask/core';
import type { SlowSegment, SlowTransits } from '../ask/transitTypes';
import { payloadFromChart } from '../savedCharts';
import type { Chart } from '../types';

const TOPICS: { id: DomainId; title: string; question: string }[] = [
  { id: 'marriage', title: 'Marriage', question: 'Marriage outlook for this year and next year' },
  { id: 'relationship', title: 'Relationships', question: 'Relationship outlook this year and next year' },
  { id: 'career', title: 'Career', question: 'Career rise or fall this year and next year' },
  { id: 'property', title: 'Property', question: 'Property outlook for this year and next year' },
  { id: 'spiritual', title: 'Spiritual growth', question: 'Spiritual outlook this year and next year' },
  { id: 'health', title: 'Health and wellbeing', question: 'Health outlook this year and next year' },
];

interface TopicOutlook {
  topic: typeof TOPICS[number];
  answer: Answer;
  favourable: Window[];
  careful: Window[];
}

interface YearOutlook {
  year: number;
  from: string;
  to: string;
  topics: TopicOutlook[];
}

function todayInZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(new Date());
  const part = (name: string) => parts.find((p) => p.type === name)?.value ?? '01';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function dashaAt(chart: Chart, date: string): { main: string; sub: string } {
  const md = chart.dashas.find((p) => p.start.slice(0, 10) <= date && date < p.end.slice(0, 10));
  if (!md) return { main: '—', sub: '—' };
  const ad = md.antardashas.find((p) => p.start.slice(0, 10) <= date && date < p.end.slice(0, 10));
  return { main: md.lord, sub: ad?.lord ?? '—' };
}

function segmentAt(segments: SlowSegment[], date: string): number | null {
  return segments.find((segment) => segment.start <= date && date < segment.end)?.signNumber ?? null;
}

function houseFrom(sign: number | null, base: number): string {
  return sign === null ? '—' : `H${((sign - base + 12) % 12) + 1}`;
}

function ranges(windows: Window[], from: string, to: string): Window[] {
  return windows.filter((w) => w.start < to && from < w.end)
    .map((w) => ({ ...w, start: w.start < from ? from : w.start, end: w.end > to ? to : w.end }));
}

function makeOutlook(chart: Chart, slow: SlowTransits, from: string, to: string): YearOutlook[] {
  const ctx = makeContext(chart, slow);
  const answers = TOPICS.map((topic) => ({
    topic,
    answer: DOMAIN_BUILDERS[topic.id](ctx, topic.question, topic.id === 'career' ? 'riseFall' : 'timing'),
  }));
  const firstYear = Number(from.slice(0, 4));
  const lastYear = Number(to.slice(0, 4)) - 1;
  return Array.from({ length: lastYear - firstYear + 1 }, (_, i) => {
    const year = firstYear + i;
    const yearFrom = from > `${year}-01-01` ? from : `${year}-01-01`;
    const yearTo = to < `${year + 1}-01-01` ? to : `${year + 1}-01-01`;
    const topics = answers.map(({ topic, answer }) => ({
      topic,
      answer,
      favourable: answer.groups.filter((g) => g.tone === 'good').flatMap((g) => ranges(g.windows, yearFrom, yearTo)).slice(0, 2),
      careful: answer.groups.filter((g) => g.tone === 'caution').flatMap((g) => ranges(g.windows, yearFrom, yearTo)).slice(0, 1),
    }));
    return { year, from: yearFrom, to: yearTo, topics };
  });
}

function TopicRow({ item }: { item: TopicOutlook }) {
  return (
    <article className="year-topic">
      <div className="year-topic-heading">
        <strong>{item.topic.title}</strong>
        <span className="pill">{item.answer.verdict.label}</span>
      </div>
      <p className="muted small">{item.answer.plain[0]}</p>
      {item.favourable.length > 0 ? (
        <ul className="year-window-list">
          {item.favourable.map((window, i) => (
            <li key={`good-${i}`}><span className="ev-good">Favourable: {formatRange(window.start, window.end)}</span>{window.md && ` · ${window.md}–${window.ad}`}</li>
          ))}
        </ul>
      ) : <p className="muted small">No standout favourable dasha window identified in this period.</p>}
      {item.careful.map((window, i) => (
        <p className="year-caution small" key={`care-${i}`}>Plan with extra care: {formatRange(window.start, window.end)} · {window.md}–{window.ad}</p>
      ))}
    </article>
  );
}

export function YearAheadCard({ chart }: { chart: Chart }) {
  const [slow, setSlow] = useState<SlowTransits | null>(null);
  const [outlooks, setOutlooks] = useState<YearOutlook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const now = todayInZone(chart.birthDetails.timeZone);
  const lastYear = Number(now.slice(0, 4));
  const from = now;
  const to = `${lastYear + 2}-01-01`;
  const monthly = useMemo(() => {
    if (!slow) return [];
    const rows: { date: string; main: string; sub: string; jupiter: string; saturn: string; rahu: string }[] = [];
    for (let monthIndex = 0; monthIndex < 24; monthIndex++) {
      const monthStart = `${lastYear + Math.floor((Number(now.slice(5, 7)) - 1 + monthIndex) / 12)}-${String(((Number(now.slice(5, 7)) - 1 + monthIndex) % 12) + 1).padStart(2, '0')}-01`;
      const date = monthStart < from ? from : monthStart;
      if (date < from || date >= to) continue;
      const dasha = dashaAt(chart, date);
      const signFor = (name: string) => segmentAt(slow.tracks.find((track) => track.name === name)?.segments ?? [], date);
      rows.push({
        date, main: dasha.main, sub: dasha.sub,
        jupiter: houseFrom(signFor('Jupiter'), chart.ascendant.signNumber),
        saturn: houseFrom(signFor('Saturn'), chart.ascendant.signNumber),
        rahu: houseFrom(signFor('Rahu'), chart.ascendant.signNumber),
      });
    }
    return rows;
  }, [slow, chart, from, to, now, lastYear]);

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const tracks = await loadSlowTransits(payloadFromChart(chart), from, to);
      setSlow(tracks);
      setOutlooks(makeOutlook(chart, tracks, from, to));
    } catch (e) {
      setError(errorMessage(e, 'Could not build the two-year outlook.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card year-ahead-card">
      <div className="transit-head">
        <div>
          <h2>This year and next</h2>
          <p className="muted small">A plain-language outlook across relationships, marriage, career, property, spiritual life and wellbeing, using your current planetary periods and Jupiter, Saturn and Rahu transits.</p>
        </div>
        <button type="button" className="button-primary no-print" disabled={loading} onClick={() => void generate()}>
          {loading ? <Loader2 className="spin" size={17} /> : <CalendarRange size={17} />}
          {loading ? 'Preparing report…' : outlooks.length ? 'Refresh report' : 'Build my report'}
        </button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {outlooks.length > 0 && (
        <div aria-live="polite">
          <p className="muted small">Coverage: {formatRange(outlooks[0].from, outlooks[outlooks.length - 1].to)} · transit houses are counted from your natal Lagna.</p>
          <div className="year-report-grid">
            {outlooks.map((year) => (
              <section className="year-report" key={year.year}>
                <h3>{year.year}{year.from !== `${year.year}-01-01` ? ' · remaining months' : ''}</h3>
                <div className="year-topics">
                  {year.topics.map((item) => <TopicRow key={item.topic.id} item={item} />)}
                </div>
              </section>
            ))}
          </div>
          <h3 className="av-title">Dasha and slow-transit calendar</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Month</th><th scope="col">Main period</th><th scope="col">Sub-period</th><th scope="col">Jupiter</th><th scope="col">Saturn</th><th scope="col">Rahu</th></tr></thead>
              <tbody>
                {monthly.map((row) => (
                  <tr key={row.date}>
                    <th scope="row">{new Date(`${row.date}T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: chart.birthDetails.timeZone })}</th>
                    <td>{row.main}</td><td>{row.sub}</td><td>{row.jupiter}</td><td>{row.saturn}</td><td>{row.rahu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">This is a timing guide, not a promise of specific events. The windows show when chart factors align; choices, circumstances and other people's charts also matter. Health content is not medical advice.</p>
        </div>
      )}
    </section>
  );
}