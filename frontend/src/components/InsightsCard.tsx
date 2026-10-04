import type { Aspect, Yoga } from '../types';
import type { JaiminiYoga } from '../jaiminiYogas';

export function InsightsCard({ aspects, yogas, jaimini }: { aspects: Aspect[]; yogas: Yoga[]; jaimini: JaiminiYoga[] }) {
  const doshas = yogas.filter((y) => /dosha|kaal sarp/i.test(y.name));
  const yogaList = yogas.filter((y) => !/dosha|kaal sarp/i.test(y.name));
  return (
    <>
      <div className="insights-grid">
        <section className="card">
          <h2>Yogas</h2>
          {yogaList.length === 0 ? (
            <p className="muted">None of the checked yogas are present in this chart.</p>
          ) : (
            <ul className="yoga-list">
              {yogaList.map((y, i) => (
                <li key={`${y.name}-${i}`}>
                  <strong>{y.name}</strong>
                  <span className="muted">{y.description}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="muted small">Raja and Dhana yogas, strength yogas and classical combinations are checked from whole-sign houses.</p>
        </section>

        <section className="card">
          <h2>Doshas and cancellations</h2>
          {doshas.length === 0 ? (
            <p className="muted">None of the checked doshas are indicated.</p>
          ) : (
            <ul className="yoga-list">
              {doshas.map((y, i) => (
              <li key={`${y.name}-${i}`}>
                <strong>{y.name}</strong>
                <span className="muted">{y.description}</span>
              </li>
            ))}
            </ul>
          )}
          <p className="muted small">Doshas are traditional astrological cautions, not diagnoses or certainties. Any detected cancellation is shown alongside the indication.</p>
        </section>
      </div>

      <section className="card">
        <h2>Jaimini yogas</h2>
        {jaimini.length === 0 ? (
          <p className="muted">No Jaimini yogas from the karakas, Arudha padas or Karakamsha are present in this chart.</p>
        ) : (
          <ul className="yoga-list">
            {jaimini.map((y) => (
              <li key={y.name}>
                <strong>{y.name} <span className={`chip chip-${y.tone === 'good' ? 'good' : y.tone === 'caution' ? 'bad' : 'neutral'}`}>{y.tone === 'good' ? 'supportive' : y.tone === 'caution' ? 'needs care' : 'notable'}</span></strong>
                <span className="muted">{y.plain}</span>
                <small className="muted">{y.technical}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small">
          Based on Jaimini's Chara karakas (planets ranked by degree), Arudha padas, Argala and the Karakamsha. Rashi drishti
          is used for aspects: movable signs see fixed signs, fixed see movable, and dual signs see each other.
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
