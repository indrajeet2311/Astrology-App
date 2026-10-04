import type { Aspect, Yoga } from '../types';

export function InsightsCard({ aspects, yogas }: { aspects: Aspect[]; yogas: Yoga[] }) {
  return (
    <>
      <section className="card">
        <h2>Yogas</h2>
        {yogas.length === 0 ? (
          <p className="muted">None of the yogas checked here are present in this chart.</p>
        ) : (
          <ul className="yoga-list">
            {yogas.map((y, i) => (
              <li key={`${y.name}-${i}`}>
                <strong>{y.name}</strong>
                <span className="muted">{y.description}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          Checked: Gaja Kesari, Budhaditya, Chandra-Mangal, Pancha Mahapurusha, Raja Yoga (kendra and trikona lords in
          the same sign) and Mangal Dosha. Houses are whole-sign from the Ascendant; no cancellation rules are applied.
        </p>
      </section>

      <section className="card">
        <h2>Aspects (Graha Drishti)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Planet</th>
                <th scope="col">Aspects houses</th>
                <th scope="col">Planets aspected</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a) => (
                <tr key={a.planet}>
                  <th scope="row">{a.planet}</th>
                  <td className="num">{a.houses.join(', ')}</td>
                  <td>{a.planets.length ? a.planets.join(', ') : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Every planet aspects the 7th house from itself; Mars also the 4th and 8th, Jupiter the 5th and 9th, Saturn the
          3rd and 10th. Rahu and Ketu are given the 7th only.
        </p>
      </section>
    </>
  );
}
