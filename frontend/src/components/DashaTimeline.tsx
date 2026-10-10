import { formatDate, todayIso } from '../format';
import type { Dasha } from '../types';

const isCurrent = (p: { start: string; end: string }, today: string) => p.start <= today && today < p.end;

export function DashaTimeline({ dashas, system }: { dashas: Dasha[]; system: string }) {
  const today = todayIso();
  return (
    <div className="dasha-list" aria-label={`${system} dasha periods`}>
      {dashas.map((d) => {
        const current = isCurrent(d, today);
        return (
          <details key={d.start} className={current ? 'dasha is-current' : 'dasha'} open={current}>
            <summary>
              <strong>{d.lord}</strong>
              <span className="muted">
                {formatDate(d.start)} – {formatDate(d.end)}
              </span>
              {current && <span className="badge">Running now</span>}
            </summary>
            <div className="nested-dashas">
              {d.antardashas.map((a) => {
                const antarCurrent = isCurrent(a, today);
                return (
                  <details key={a.start} open={antarCurrent} className="antar-period">
                    <summary>
                      <strong>{d.lord}–{a.lord}</strong>
                      <span className="muted">{formatDate(a.start)} – {formatDate(a.end)}</span>
                      {antarCurrent && <span className="muted small">Now</span>}
                    </summary>
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th scope="col">Pratyantardasha</th><th scope="col">From</th><th scope="col">To</th></tr></thead>
                        <tbody>
                          {a.pratyantardashas.map((p) => (
                            <tr key={p.start} className={isCurrent(p, today) ? 'is-current-row' : undefined}>
                              <th scope="row">{d.lord}–{a.lord}–{p.lord}</th>
                              <td className="num">{formatDate(p.start)}</td>
                              <td className="num">{formatDate(p.end)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
