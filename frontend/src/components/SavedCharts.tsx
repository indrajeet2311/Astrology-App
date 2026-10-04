import { Trash2 } from 'lucide-react';
import { formatDate } from '../format';
import type { BirthPayload } from '../types';
import type { SavedChart } from '../savedCharts';

interface Props {
  charts: SavedChart[];
  onOpen: (payload: BirthPayload) => void;
  onDelete: (id: string) => void;
}

export function SavedCharts({ charts, onOpen, onDelete }: Props) {
  return (
    <section className="card saved-charts" aria-labelledby="saved-charts-title">
      <div className="saved-charts-head">
        <div>
          <h2 id="saved-charts-title">Saved charts</h2>
          <p className="muted small">Stored in this browser only.</p>
        </div>
        <span className="muted small">{charts.length}</span>
      </div>
      {charts.length === 0 ? (
        <p className="muted saved-empty">No charts saved yet. Save one from its results page.</p>
      ) : (
        <ul className="saved-chart-list">
          {charts.map(({ id, payload }) => (
            <li className="saved-chart-row" key={id}>
              <div className="saved-chart-info">
                <strong>{payload.name || payload.placeName}</strong>
                <small>{formatDate(payload.date)} · {payload.time} · {payload.placeName}</small>
              </div>
              <div className="saved-chart-actions">
                <button type="button" className="button-ghost" onClick={() => onOpen(payload)}>
                  Open
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Delete saved chart for ${payload.name || payload.placeName}`}
                  title="Delete saved chart"
                  onClick={() => onDelete(id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}