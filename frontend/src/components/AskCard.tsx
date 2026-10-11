import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, HeartHandshake, Loader2, MessageCircleQuestion, Sparkles } from 'lucide-react';
import { errorMessage } from '../api';
import { answerQuestion, classify, SUGGESTED_QUESTIONS } from '../ask/engine';
import type { UserAnswer } from '../ask/engine';
import type { DomainId } from '../ask/answers';
import { formatRange, makeContext } from '../ask/core';
import type { Chart } from '../types';

export function AnswerView({ answer }: { answer: UserAnswer }) {
  const { outcome } = answer;
  const showTiming = answer.focus !== 'nature' && !outcome.limitation
    && ['marriage', 'relationship', 'career', 'children'].includes(answer.domain);
  return (
    <article className="answer" aria-live="polite">
      <p className="answer-q">{answer.domainLabel} · “{answer.question}”</p>
      <section className="reading-card reading-summary">
        <div className="reading-card-heading"><Sparkles size={19} aria-hidden="true" /><h3>Your answer</h3></div>
        <p>{outcome.summary}</p>
      </section>
      {showTiming && (
        <section className="reading-card reading-timing">
          <div className="reading-card-heading"><CalendarRange size={19} aria-hidden="true" /><h3>Periods to consider</h3></div>
          {outcome.timing.length > 0 ? (
            <div className="reading-period-grid">
              {outcome.timing.slice(0, 3).map((period) => (
                <div className={`reading-period reading-period-${period.tone}`} key={`${period.start}-${period.end}-${period.tone}`}>
                  <span className="reading-label">{period.tone === 'good' ? 'Opportunity to explore' : 'Plan with extra care'}</span>
                  <strong>{formatRange(period.start, period.end)}</strong>
                  <p>{period.text}</p>
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
            <span className="reading-label">{card.tone === 'good' ? 'Support to build on' : card.tone === 'bad' ? 'Needs attention' : 'Keep in perspective'}</span>
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
  const topics = useMemo(() => SUGGESTED_QUESTIONS, []);

  useEffect(() => {
    readingVersion.current += 1;
    setAnswers([]);
    setMessage('');
    setLoading(false);
  }, [chart]);

  const ask = (text: string, forcedDomain: DomainId | '' = domain) => {
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
      const ctx = makeContext(chart, null);
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
