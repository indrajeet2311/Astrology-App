import { useState } from 'react';
import { errorMessage } from '../api';
import { formatDate } from '../format';
import { payloadFromChart, sameBirthPayload } from '../savedCharts';
import type { SavedChart } from '../savedCharts';
import type { BirthPayload, Chart, CompatibilityLayer, CompatibilityRule, KundliMatch } from '../types';

function Layer({ layer }: { layer: CompatibilityLayer }) {
  return (
    <section className="compat-layer">
      <div className="compat-layer-head">
        <h3>{layer.name}</h3>
        <strong>{layer.points.toFixed(layer.points % 1 ? 1 : 0)} <span className="muted">/ {layer.maxPoints}</span></strong>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Rule</th><th scope="col">Score</th><th scope="col">Reason and evidence</th></tr></thead>
          <tbody>
            {layer.rules.map((rule) => <RuleRow key={rule.name} rule={rule} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RuleRow({ rule }: { rule: CompatibilityRule }) {
  return (
    <tr>
      <th scope="row">{rule.name}<small className={rule.matched ? 'compat-matched' : 'muted'}>{rule.matched ? 'Matched' : 'Not matched'}</small></th>
      <td className="num">{rule.points.toFixed(rule.points % 1 ? 1 : 0)} / {rule.maxPoints}</td>
      <td><span>{rule.reason}</span>{rule.evidence.length > 0 && <ul className="compat-evidence">{rule.evidence.map((item) => <li key={item}>{item}</li>)}</ul>}</td>
    </tr>
  );
}

function Highlight({ rule }: { rule: CompatibilityRule }) {
  return (
    <article className="compat-highlight">
      <div className="compat-layer-head"><h4>{rule.name}</h4><span className="pill">{rule.points > 0 ? `Signal · ${rule.points}/${rule.maxPoints}` : 'Context'}</span></div>
      <p>{rule.reason}</p>
      <ul className="compat-evidence">{rule.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}

interface Props {
  chart: Chart;
  savedCharts: SavedChart[];
  onMatch: (groom: BirthPayload) => Promise<KundliMatch>;
}

export function KundliMatchCard({ chart, savedCharts, onMatch }: Props) {
  const bride = payloadFromChart(chart);
  const options = savedCharts.filter((saved) => !sameBirthPayload(saved.payload, bride));
  const [groomId, setGroomId] = useState('');
  const [result, setResult] = useState<KundliMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const groom = options.find((saved) => saved.id === groomId) ?? options[0];

  const compare = async () => {
    if (!groom) return;
    setLoading(true);
    setError('');
    try {
      setResult(await onMatch(groom.payload));
    } catch (e) {
      setError(errorMessage(e, 'Could not compare these charts.'));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card">
      <h2>Vedic compatibility and synastry</h2>
      <p className="muted small">Choose a saved partner chart. Moon-based Ashtakoota, Other Vedic rules and Chance of Marriage are scored in separate layers; relationship synastry is shown as evidence, not blended into those totals.</p>
      {options.length === 0 ? (
        <p className="muted match-empty">Save another chart first to compare the two Moon charts.</p>
      ) : (
        <div className="match-controls">
          <label htmlFor="match-groom">Partner's saved chart</label>
          <select id="match-groom" value={groom?.id ?? ''} onChange={(event) => {
            setGroomId(event.target.value);
            setResult(null);
          }}>
            {options.map((saved) => (
              <option key={saved.id} value={saved.id}>
                {saved.payload.name || saved.payload.placeName} · {formatDate(saved.payload.date)}
              </option>
            ))}
          </select>
          <button type="button" className="button-primary match-button" disabled={loading} onClick={compare}>
            {loading ? 'Comparing…' : 'Compare charts'}
          </button>
        </div>
      )}
      {error && <p className="alert" role="alert">{error}</p>}
      {result && (
        <div className="match-result" aria-live="polite">
          <p className="match-total">
            <strong>{Number.isInteger(result.score) ? result.score : result.score.toFixed(1)}</strong>
            <span className="muted"> / {result.maxScore} points</span>
          </p>
          <p className="muted small">Moon signs: {result.brideMoonSign} · {result.groomMoonSign}</p>
          {result.summary && <p className="banner"><strong>Summary.</strong> {result.summary}</p>}
          <div className="compat-score-overview">
            <div className="compat-score-block"><span className="muted small">Moon Vedic · Ashtakoota</span><strong>{result.score.toFixed(result.score % 1 ? 1 : 0)} <small>/ {result.maxScore}</small></strong></div>
            {result.compatibility && <>
              <div className="compat-score-block"><span className="muted small">Other Vedic</span><strong>{result.compatibility.otherVedic.points.toFixed(1)} <small>/ 50</small></strong></div>
              <div className="compat-score-block"><span className="muted small">Chance of Marriage</span><strong>{result.compatibility.chanceOfMarriage.points.toFixed(2)} <small>/ 5</small></strong></div>
            </>}
          </div>
          {result.manglik && (
            <div className="manglik-grid">
              {([['Bride', result.manglik.bride], ['Groom', result.manglik.groom]] as const).map(([who, m]) => (
                <div key={who} className={`fact ${m.level === 'High' || m.level === 'Medium' ? 'slot-bad' : m.level === 'None' || m.level === 'Cancelled' ? 'slot-good' : ''}`}>
                  <span className="muted small">{who} · Mangal dosha</span>
                  <strong>{m.level}</strong>
                  {m.factors.map((f) => <small key={f}>{f}</small>)}
                  {m.cancellations.map((c) => <small key={c} className="muted">Cancelled: {c}</small>)}
                </div>
              ))}
            </div>
          )}
          {result.manglik && <p className="muted small">{result.manglik.verdict}</p>}
          <details className="compat-layer-details">
            <summary>Moon Vedic score breakdown · Ashtakoota (36)</summary>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th scope="col">Koota</th><th scope="col">Score</th><th scope="col">What it compares</th></tr>
              </thead>
              <tbody>
                {result.kootas.map((koota) => (
                  <tr key={koota.name}>
                    <th scope="row">{koota.name}</th>
                    <td className="num">{koota.score} / {koota.maxScore}</td>
                    <td>{koota.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </details>
          {result.compatibility && (
            <>
              <Layer layer={result.compatibility.otherVedic} />
              <Layer layer={result.compatibility.chanceOfMarriage} />
              <section className="compat-layer">
                <h3>Chance of Marriage · 12-house connection sets</h3>
                <p className="muted small">Each house receives equal weight. Similar connection patterns across the two charts contribute to the separate 5-point score.</p>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th scope="col">House</th><th scope="col">Groom connections</th><th scope="col">Bride connections</th><th scope="col">Overlap</th><th scope="col">Match</th></tr></thead>
                    <tbody>{result.compatibility.connectionSets.map((row) => (
                      <tr key={row.house}>
                        <th scope="row">H{row.house}{row.house === 7 ? ' · Marriage' : ''}</th>
                        <td>{row.groom.join(', ') || '—'}</td><td>{row.bride.join(', ') || '—'}</td>
                        <td>{row.overlap.join(', ') || '—'}</td><td>{row.matched ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </section>
              <section className="compat-layer">
                <h3>Direct Vedic synastry</h3>
                <p className="muted small">Sign and house contacts describe relationship dynamics. Their points are per-highlight only and are not added to either compatibility score.</p>
                {result.compatibility.directSynastry.length ? <div className="compat-highlights">{result.compatibility.directSynastry.map((rule, i) => <Highlight key={`${rule.name}-${i}`} rule={rule} />)}</div> : <p className="muted">No highlighted direct contacts were found.</p>}
              </section>
              <section className="compat-layer">
                <h3>Marriage-specific synastry</h3>
                <p className="muted small">Partner 7th-house overlays and 7th-lord links, kept separate from score totals.</p>
                {result.compatibility.marriageSynastry.length ? <div className="compat-highlights">{result.compatibility.marriageSynastry.map((rule, i) => <Highlight key={`${rule.name}-${i}`} rule={rule} />)}</div> : <p className="muted">No highlighted marriage-specific contacts were found.</p>}
                <ul className="match-notes">{result.compatibility.notes.map((note) => <li key={note}>{note}</li>)}</ul>
              </section>
            </>
          )}
          <ul className="match-notes">
            {result.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
          {result.remedies && result.remedies.length > 0 && (
            <>
              <h3 className="av-title">Recommended remedies</h3>
              <ul className="match-notes">
                {result.remedies.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}