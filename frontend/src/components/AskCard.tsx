import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, HeartHandshake, Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { errorMessage, loadSlowTransits } from '../api';
import { answerQuestion, classify, SUGGESTED_QUESTIONS } from '../ask/engine';
import type { UserAnswer } from '../ask/engine';
import type { DomainId } from '../ask/answers';
import { formatRange, makeContext } from '../ask/core';
import { todayIso } from '../format';
import type { Chart } from '../types';
import { payloadFromChart } from '../savedCharts';
import type { SlowTransits } from '../ask/transitTypes';

function plusYears(date: string, years: number): string {
  const value = new Date(`${date}T12:00:00`);
  value.setFullYear(value.getFullYear() + years);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function AnswerView({ answer }: { answer: UserAnswer }) {
  const { outcome } = answer;
  const showTiming = answer.focus !== 'nature' && !outcome.limitation
    && ['marriage', 'relationship', 'career', 'children'].includes(answer.domain);
  const timingOrder = ['Vimshottari', 'Yogini', 'Chara'];
  const displayedTiming = timingOrder.flatMap((system) => {
    const period = outcome.timing.find((item) => item.system === system);
    return period ? [period] : [];
  });
  return (
    <article className="answer" aria-live="polite">
      <p className="answer-q">{answer.domainLabel} · “{answer.question}”</p>
      <section className="reading-card reading-summary">
        <div className="reading-card-heading"><Sparkles size={19} aria-hidden="true" /><h3>Your answer</h3></div>
        <p>{outcome.summary}</p>
      </section>
      {answer.domain === 'marriage' && (
        <section className={`reading-card marriage-promise-card reading-card-${answer.verdict.tone}`} aria-label="Marriage promise assessment">
          <div className="reading-card-heading"><HeartHandshake size={18} aria-hidden="true" /><h3>Marriage promise</h3></div>
          <div className="marriage-promise-score">
            <span>{answer.verdict.label}</span>
            <strong>{answer.score}<small>/100</small></strong>
          </div>
          <div className="marriage-promise-meter" role="meter" aria-label="Rule-based marriage score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={answer.score}>
            <span style={{ width: `${answer.score}%` }} />
          </div>
          <p>This traditional score weighs the birth-chart marriage promise against Navamsa support and strain, planetary condition and cross-chart links. It is not a probability; timing is assessed separately below.</p>
        </section>
      )}
      {showTiming && (
        <section className="reading-card reading-timing">
          <div className="reading-card-heading"><CalendarRange size={19} aria-hidden="true" /><h3>Periods to consider</h3></div>
          {outcome.timing.length > 0 ? (
            <div className="reading-period-grid">
              {displayedTiming.map((period) => (
                <div className={`reading-period reading-period-${period.tone}`} key={`${period.system}-${period.start}-${period.end}-${period.tone}`}>
                  <span className="reading-label">{period.system === 'Vimshottari' ? 'Primary timing' : 'Cross-check'}</span>
                  <span className="reading-label">{period.system} dasha · {period.tone === 'good' ? 'supportive' : 'use extra care'}</span>
                  <strong>{formatRange(period.start, period.end)}</strong>
                  <p>{period.text}</p>
                  {period.transitContacts?.length ? (
                    <div className="reading-footnote">
                      <span>Transit sign-aspect cross-checks:</span>
                      <ul>
                        {period.transitContacts.map((contact, index) => (
                          <li key={`${contact.planet}-${contact.target}-${contact.start}-${index}`}>
                            {contact.aspect === 'transits over' || contact.aspect === 'conjunction'
                              ? `${contact.planet} transits over ${contact.target}`
                              : `${contact.planet}’s ${contact.aspect} reaches ${contact.target}`} · {formatRange(contact.start, contact.end)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : period.transitCheck === 'not-found' ? (
                    <p className="reading-footnote">No Jupiter or Saturn sign-aspect contact with the topic-specific chart factors in this dasha window; the dasha indication remains.</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : <p>No matching period was identified in the next ten years using the available checks. Timing is inconclusive, not a denial of possibilities.</p>}
          <p className="reading-footnote">{outcome.timingNote}</p>
        </section>
      )}
      <div className="reading-grid">
        {outcome.cards.filter((card) => card.text !== outcome.summary).map((card) => (
          <section className={`reading-card reading-card-${card.tone}`} key={card.id}>
            <div className="reading-card-heading"><HeartHandshake size={18} aria-hidden="true" /><h3>{card.title}</h3></div>
            <p>{card.text}</p>
          </section>
        ))}
      </div>
      <p className="reading-footnote">{outcome.advice[outcome.advice.length - 1]}</p>
    </article>
  );
}

export function AskCard({ chart }: { chart: Chart }) {
  const [question, setQuestion] = useState('');
  const [domain, setDomain] = useState<DomainId | ''>('');
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const readingVersion = useRef(0);
  const transitCache = useRef<{ chart: Chart; data: SlowTransits } | null>(null);
  const topics = useMemo(() => SUGGESTED_QUESTIONS, []);

  useEffect(() => {
    readingVersion.current += 1;
    setAnswers([]);
    setMessage('');
    setLoading(false);
    transitCache.current = null;
  }, [chart]);

  const ask = async (text: string, forcedDomain: DomainId | '' = domain) => {
    const q = text.trim();
    if (!q) {
      setMessage('Add a question so the reading can focus on what you want to know.');
      return;
    }
    const classified = classify(q);
    const answerDomain = classified.domain || forcedDomain;
    if (!answerDomain) {
      setMessage('Choose a topic or mention marriage, relationships, children, career, property, spirituality or health in your question.');
      return;
    }
    setDomain(answerDomain);
    const version = ++readingVersion.current;
    setMessage('');
    setLoading(true);
    try {
      let slowTransits: SlowTransits | null = null;
      if (['marriage', 'relationship', 'career'].includes(answerDomain)) {
        const cached = transitCache.current;
        if (cached?.chart === chart) slowTransits = cached.data;
        else {
          const from = todayIso();
          try {
            slowTransits = await loadSlowTransits(payloadFromChart(chart), from, plusYears(from, 10));
            transitCache.current = { chart, data: slowTransits };
          } catch {
            // Keep the reading available; its timing note will state that transits were unavailable.
          }
        }
      }
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
      <p className="muted small">Ask about the outcome that matters to you. The reading combines your birth details with topic-specific charts and timing checks, then explains the results in everyday language.</p>
      <form className="ask-form" onSubmit={(e) => { e.preventDefault(); void ask(question); }}>
        <label className="field ask-topic-field">
          <span className="label">What would you like guidance on?</span>
          <select aria-label="Chart question topic" value={domain} onChange={(event) => setDomain(event.target.value as DomainId | '')}>
            <option value="">Choose a topic</option>
            <option value="marriage">Marriage</option>
            <option value="relationship">Relationships</option>
            <option value="children">Children and parenting</option>
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
    </section>
  );
}
