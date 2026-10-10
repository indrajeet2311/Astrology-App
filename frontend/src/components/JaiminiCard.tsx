import { useMemo, useState } from 'react';
import { SIGN_GLYPHS, SIGN_NAMES } from '../constants';
import { arudhaChart, arudhaPadas, charaKarakas, karakamshaChart } from '../jaimini';
import type { Chart } from '../types';
import { NorthIndianChart } from './NorthIndianChart';
import { SouthIndianChart } from './SouthIndianChart';

export function JaiminiCard({ chart }: { chart: Chart }) {
  const karakas = useMemo(() => charaKarakas(chart), [chart]);
  const padas = useMemo(() => arudhaPadas(chart), [chart]);
  const [style, setStyle] = useState<'north' | 'south'>('north');
  const [withPlanets, setWithPlanets] = useState(false);
  const atmakaraka = karakas[0];
  const karakamsha = atmakaraka.navamsaSign;
  const kChart = useMemo(() => karakamshaChart(chart, karakamsha), [chart, karakamsha]);
  const aChart = useMemo(() => arudhaChart(chart, padas, withPlanets), [chart, padas, withPlanets]);
  const ChartView = style === 'north' ? NorthIndianChart : SouthIndianChart;

  return (
    <section className="card">
      <div className="card-head">
        <h2>Jaimini: Karakas, Karakamsha and Arudhas</h2>
        <div className="segmented no-print" role="group" aria-label="Jaimini chart style">
          <button type="button" aria-pressed={style === 'north'} onClick={() => setStyle('north')}>North Indian</button>
          <button type="button" aria-pressed={style === 'south'} onClick={() => setStyle('south')}>South Indian</button>
        </div>
      </div>

      <div className="annual-facts">
        <div className="fact">
          <span className="muted small">Atmakaraka</span>
          <strong>{atmakaraka.planet.name}</strong>
          <small>{atmakaraka.planet.sign} · {atmakaraka.planet.degreeInSign.toFixed(2)}°</small>
        </div>
        <div className="fact">
          <span className="muted small">Karakamsha</span>
          <strong><span className="glyph" aria-hidden>{SIGN_GLYPHS[karakamsha - 1]}</span> {SIGN_NAMES[karakamsha - 1]}</strong>
          <small>Atmakaraka's navamsa sign</small>
        </div>
        <div className="fact">
          <span className="muted small">Arudha Lagna</span>
          <strong><span className="glyph" aria-hidden>{SIGN_GLYPHS[padas[0].sign - 1]}</span> {SIGN_NAMES[padas[0].sign - 1]}</strong>
          <small>House {padas[0].houseFromLagna} from Lagna</small>
        </div>
        <div className="fact">
          <span className="muted small">Upapada (UL)</span>
          <strong><span className="glyph" aria-hidden>{SIGN_GLYPHS[padas[11].sign - 1]}</span> {SIGN_NAMES[padas[11].sign - 1]}</strong>
          <small>House {padas[11].houseFromLagna} from Lagna</small>
        </div>
      </div>

      <h3 className="av-title">Chara karakas</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Karaka</th><th scope="col">Planet</th><th scope="col">Degree in sign</th><th scope="col">Sign</th><th scope="col">Navamsa</th><th scope="col">Signifies</th></tr>
          </thead>
          <tbody>
            {karakas.map((k) => (
              <tr key={k.code}>
                <th scope="row">{k.code} · {k.name}</th>
                <td>{k.planet.name}</td>
                <td className="num">{k.planet.degreeInSign.toFixed(2)}°</td>
                <td>{k.planet.sign}</td>
                <td>{SIGN_NAMES[k.navamsaSign - 1]}</td>
                <td className="muted small">{k.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Seven-planet scheme (Rahu and Ketu excluded). Ranked by degree within the sign, highest first.</p>

      <div className="jaimini-charts">
        <div>
          <h3 className="av-title">Karakamsha chart</h3>
          <ChartView chart={kChart} label="Karakamsha" />
          <p className="muted small">Navamsa positions with the Karakamsha ({SIGN_NAMES[karakamsha - 1]}) as the first house.</p>
        </div>
        <div>
          <h3 className="av-title">Arudha chart</h3>
          <label className="check-row no-print">
            <input type="checkbox" checked={withPlanets} onChange={(e) => setWithPlanets(e.target.checked)} />
            Show planets too
          </label>
          <ChartView chart={aChart} label="Arudha padas" />
          <p className="muted small">AL is the Arudha Lagna; UL (A12) is the Upapada. Rashi houses from the Ascendant.</p>
        </div>
      </div>

      <h3 className="av-title">Arudha padas</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th scope="col">Pada</th><th scope="col">Meaning</th><th scope="col">House sign</th><th scope="col">Lord</th><th scope="col">Arudha sign</th><th scope="col">House from Lagna</th></tr>
          </thead>
          <tbody>
            {padas.map((p) => (
              <tr key={p.code}>
                <th scope="row">{p.code}</th>
                <td>{p.name}</td>
                <td>{SIGN_NAMES[p.houseSign - 1]}</td>
                <td>{p.lord} ({SIGN_NAMES[p.lordSign - 1]})</td>
                <td><span className="glyph" aria-hidden>{SIGN_GLYPHS[p.sign - 1]}</span> {SIGN_NAMES[p.sign - 1]}</td>
                <td className="num">{p.houseFromLagna}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Each pada counts the house lord's distance from its house and the same distance again; a result in the house itself or its 7th moves to the 10th from there. Scorpio and Aquarius use Mars and Saturn as lords.</p>
    </section>
  );
}
