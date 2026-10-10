import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MessageCircleQuestion } from 'lucide-react';
import { errorMessage, loadSlowTransits } from '../api';
import { ratingWord } from '../ask/answers';
import type { Answer, WindowGroup } from '../ask/answers';
import { answerQuestion, classify, SUGGESTED_QUESTIONS } from '../ask/engine';
import type { DomainId } from '../ask/answers';
import { formatRange, makeContext } from '../ask/core';
import type { SlowTransits } from '../ask/transitTypes';
import { payloadFromChart } from '../savedCharts';
import type { Chart } from '../types';

const isoYears = (date: string, years: number) => {
  const d = new Date(`${date}T12:00:00`);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
};

const GLOSSARY: [string, string][] = [
  ['Dasha (planetary period)', 'Vedic astrology divides life into periods ruled by planets. A long "main period" (mahadasha) sets the background, and a shorter "sub-period" (antardasha) inside it often triggers events.'],
  ['Houses', 'The chart has 12 areas of life. The 7th is marriage and partnerships, the 10th is career, the 4th is home and property, the 9th is luck and faith, and the 1st is you and your body.'],
  ['Ruling planet (house lord)', 'Each house is looked after by a planet. How strong that planet is, and where it sits, shows how that area of life tends to go.'],
  ['Natural significator (karaka)', 'A planet that stands for a theme in general. For example Venus for love, Mars for land, Jupiter for wisdom and Saturn for discipline.'],
  ['Navamsa, Dasamsa, Chaturthamsa', 'Divisional charts: finer "zoomed-in" charts for one topic. Navamsa (D9) is for marriage, Dasamsa (D10) for career and Chaturthamsa (D4) for property.'],
  ['Jupiter–Saturn transit', 'Jupiter and Saturn move slowly. When both support the same area of your chart, events in that area are more likely to happen.'],
  ['Jaimini astrology', 'A second system that uses planets ranked by degree (karakas) and special points such as the Arudha Lagna (public image) and Upapada (marriage point).'],
  ['Vargottama', 'A planet that is in the same sign in the main chart and in a divisional chart. It is considered stronger.'],
];

function Windows({ group }: { group: WindowGroup }) {
  if (group.windows.length === 0) return null;
  return (
    <div>
      <h4>{group.title}</h4>
      <p className="muted small">{group.blurb}</p>
      {group.windows.map((w) => (
        <div key={`${w.system}-${w.start}-${w.ad}`} className={`win win-${group.tone}`}>
          <div className="win-head">
            <strong>{formatRange(w.start, w.end)}</strong>
            <span className="pill">{w.system}</span>
            {(w.confluence ?? 1) > 1 && <span className="pill">{w.confluence}/3 dasha systems overlap</span>}
            <span className="pill">{ratingWord(w.relative, group.tone)}</span>
            {w.current && <span className="badge-now">now</span>}
          </div>
          {w.peaks.length > 0 && (
            <div className="win-peak">
              {w.peaks.filter((p) => !p.note.startsWith('Navatara:')).slice(0, 2).map((p) => (
                <div key={`${p.start}-${p.end}-${p.note}`}>Transit confirmation: {formatRange(p.start, p.end)} <span className="muted">({p.note})</span></div>
              ))}
              {w.peaks.filter((p) => p.note.startsWith('Navatara:')).slice(0, 2).map((p) => (
                <div key={`${p.start}-${p.end}-${p.note}`}>{formatRange(p.start, p.end)} <span className="muted">({p.note})</span></div>
              ))}
            </div>
          )}
          {w.plain && <p className="small muted">{w.plain}</p>}
          {(w.convergence ?? []).map((interval) => (
            <p className="small muted" key={`${interval.start}-${interval.end}`}>
              Agreement: {formatRange(interval.start, interval.end)} · {interval.systems.join(' + ')}
            </p>
          ))}
          {w.reasons.length > 0 && (
            <details>
              <summary>Period assessment</summary>
              <ul>{w.reasons.map((reason, index) => <li className="small" key={`${index}-${reason}`}>{reason}</li>)}</ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

function AnswerView({ answer }: { answer: Answer }) {
  return (
    <article className="answer" aria-live="polite">
      <p className="answer-q">{answer.domainLabel} · “{answer.question}”</p>
      {answer.headline && <p className="answer-headline">{answer.headline}</p>}
      <div className="answer-verdict">
        <strong>{answer.verdict.label}</strong>
        <div className="answer-score" role="img" aria-label={`Score ${answer.score} of 100`}><span style={{ width: `${answer.score}%` }} /></div>
        <span className="num">{answer.score}</span>
      </div>

      <h4>In simple words</h4>
      {answer.plain.map((s) => <p key={s}>{s}</p>)}

      {answer.nature.length > 0 && (
        <>
          <h4>{answer.natureTitle}</h4>
          <ul>{answer.nature.map((n) => <li key={n}>{n}</li>)}</ul>
        </>
      )}

      {answer.jaimini.length > 0 && (
        <>
          <h4>What Jaimini astrology adds</h4>
          <ul>
            {answer.jaimini.map((y) => (
              <li key={y.name}>
                <strong>{y.name}</strong>{' '}
                <span className={`chip chip-${y.tone === 'good' ? 'good' : y.tone === 'caution' ? 'bad' : 'neutral'}`}>
                  {y.tone === 'good' ? 'supportive' : y.tone === 'caution' ? 'needs care' : 'notable'}
                </span>
                <div className="small muted">{y.plain}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {answer.groups.map((g) => <Windows key={g.title} group={g} />)}

      <details className="shadbala-details">
        <summary>The astrology behind this answer</summary>
        <ul>{answer.technical.filter((text) => !answer.evidence.some((item) => item.text === text)).map((t) => <li key={t} className="small">{t}</li>)}</ul>
        <ul>{answer.evidence.map((e) => <li key={e.text} className={`small ${e.tone === 'good' ? 'ev-good' : e.tone === 'bad' ? 'ev-bad' : ''}`}>{e.text}</li>)}</ul>
      </details>
      <div className="answer-notes">{answer.notes.map((n) => <p key={n} className="muted small">{n}</p>)}</div>
    </article>
  );
}

export function AskCard({ chart }: { chart: Chart }) {
  const [question, setQuestion] = useState('');
  const [domain, setDomain] = useState<DomainId | ''>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const transits = useRef<SlowTransits | null>(null);
  const readingVersion = useRef(0);
  const birth = chart.birthDetails.date;
  const topics = useMemo(() => SUGGESTED_QUESTIONS, []);

  useEffect(() => {
    readingVersion.current += 1;
    transits.current = null;
    setAnswers([]);
    setMessage('');
    setLoading(false);
  }, [chart]);

  const ensureTransits = async (version: number): Promise<SlowTransits | null> => {
    if (transits.current) return transits.current;
    const today = new Date().toISOString().slice(0, 10);
    const to = isoYears(today, 25) > '2099-12-31' ? '2099-12-31' : isoYears(today, 25);
    const earliest = isoYears(to, -79);
    const from = isoYears(birth, 16) > earliest ? isoYears(birth, 16) : earliest;
    try {
      const loaded = await loadSlowTransits(payloadFromChart(chart), from, to);
      if (version === readingVersion.current) transits.current = loaded;
      return loaded;
    } catch (e) {
      if (version === readingVersion.current) setMessage(errorMessage(e, 'Transit data was unavailable; answers use planetary periods only.'));
    }
    return null;
  };

  const ask = async (text: string, forcedDomain: DomainId | '' = domain) => {
    const q = text.trim();
    if (!q) {
      setMessage('Add a question so the reading can focus on what you want to know.');
      return;
    }
    const classified = classify(q);
    const answerDomain = classified.domain || forcedDomain;
    if (!answerDomain) {
      setMessage('Choose a topic or mention marriage, relationships, career, property, spirituality or health in your question.');
      return;
    }
    setDomain(answerDomain);
    const version = ++readingVersion.current;
    setMessage('');
    setLoading(true);
    try {
      const slowTransits = await ensureTransits(version);
      if (version !== readingVersion.current) return;
      const ctx = makeContext(chart, slowTransits);
      const answer = answerQuestion(ctx, q, answerDomain);
      if (answer) setAnswers((prev) => [answer, ...prev]);
      setQuestion('');
    } catch (e) {
      if (version === readingVersion.current) setMessage(errorMessage(e, 'Could not read your chart. Please try again.'));
    } finally {
      if (version === readingVersion.current) setLoading(false);
    }
  };

  return (
    <section className="card ask-card">
      <h2>Ask Your Chart</h2>
      <p className="muted small">Choose the area you want guidance on, then ask a specific question. Your answer uses your birth chart, relevant divisional chart, planetary periods and transits.</p>
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); void ask(question); }}>
        <label className="field ask-topic-field">
          <span className="label">What would you like guidance on?</span>
          <select aria-label="Chart question topic" value={domain} onChange={(event) => setDomain(event.target.value as DomainId | '')}>
            <option value="">Choose a topic</option>
            <option value="marriage">Marriage</option>
            <option value="relationship">Relationships</option>
            <option value="career">Career</option>
            <option value="property">Property and home</option>
            <option value="spiritual">Spiritual growth</option>
            <option value="health">Health and wellbeing</option>
          </select>
        </label>
        <input
          type="text"
          value={question}
          maxLength={200}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Write your question, e.g. When might marriage be more likely?"
          aria-label="Your question"
        />
        <button type="submit" className="button-primary" disabled={loading || !question.trim()}>
          {loading ? <Loader2 className="spin" size={17} /> : <MessageCircleQuestion size={17} />}
          {loading ? 'Reading…' : 'Ask'}
        </button>
      </form>
      <div className="ask-chips no-print">
        {topics.map((t) => (
          <button key={t.label} type="button" disabled={loading} onClick={() => { setDomain(t.domain); void ask(t.question, t.domain); }}>{t.label}</button>
        ))}
      </div>
      {message && <p className="alert" role="status">{message}</p>}
      {answers.map((a, i) => <AnswerView key={`${a.question}-${i}`} answer={a} />)}
      <details className="shadbala-details">
        <summary>What do these terms mean?</summary>
        <dl className="details">
          {GLOSSARY.map(([term, meaning]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd className="small muted">{meaning}</dd>
            </div>
          ))}
        </dl>
      </details>
    </section>
  );
}
