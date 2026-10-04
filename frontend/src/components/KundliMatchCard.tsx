import { useState } from 'react';
import { errorMessage } from '../api';
import { formatDate } from '../format';
import { payloadFromChart, sameBirthPayload } from '../savedCharts';
import type { SavedChart } from '../savedCharts';
import type { BirthPayload, Chart, KundliMatch } from '../types';

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
      <h2>Kundli matching (Ashtakoota)</h2>
      <p className="muted small">This chart is treated as the bride. Choose a saved chart for the groom.</p>
      {options.length === 0 ? (
        <p className="muted match-empty">Save another chart first to compare the two Moon charts.</p>
      ) : (
        <div className="match-controls">
          <label htmlFor="match-groom">Groom's saved chart</label>
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
          <ul className="match-notes">
            {result.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}