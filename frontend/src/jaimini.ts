import { SIGN_LORDS, SIGN_NAMES } from './constants';
import type { Chart, Position } from './types';

const KARAKA_NAMES = [
  ['AK', 'Atmakaraka', 'The soul significator; the planet at the highest degree.'],
  ['AmK', 'Amatyakaraka', 'Career and advisers.'],
  ['BK', 'Bhratrikaraka', 'Siblings and courage.'],
  ['MK', 'Matrikaraka', 'Mother and education.'],
  ['PiK', 'Putrakaraka', 'Children and creativity.'],
  ['GK', 'Gnatikaraka', 'Rivals, relatives and obstacles.'],
  ['DK', 'Darakaraka', 'Spouse and partnerships.'],
] as const;

const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

export interface Karaka {
  code: string;
  name: string;
  meaning: string;
  planet: Position;
  navamsaSign: number;
}

/** Jaimini Chara karakas from the seven-planet scheme, ranked by degree within the sign. */
export function charaKarakas(chart: Chart): Karaka[] {
  return chart.planets
    .filter((p) => SEVEN.includes(p.name))
    .sort((a, b) => b.degreeInSign - a.degreeInSign)
    .map((planet, i) => ({
      code: KARAKA_NAMES[i][0],
      name: KARAKA_NAMES[i][1],
      meaning: KARAKA_NAMES[i][2],
      planet,
      navamsaSign: planet.navamsaSignNumber,
    }));
}

/** Navamsa chart whose first house is the Karakamsha (the Atmakaraka's navamsa sign). */
export function karakamshaChart(chart: Chart, karakamsha: number): Chart {
  const convert = (p: Position): Position => ({
    ...p,
    signNumber: p.navamsaSignNumber,
    sign: SIGN_NAMES[p.navamsaSignNumber - 1],
    house: 1 + ((p.navamsaSignNumber - karakamsha + 12) % 12),
  });
  const ascendant: Position = {
    ...chart.ascendant, name: 'Ascendant', signNumber: karakamsha, sign: SIGN_NAMES[karakamsha - 1], house: 1,
  };
  return { ...chart, ascendant, planets: chart.planets.map(convert) };
}

export interface ArudhaPada {
  house: number;
  code: string;
  name: string;
  houseSign: number;
  lord: string;
  lordSign: number;
  sign: number;
  houseFromLagna: number;
}

const PADA_NAMES = [
  'Arudha Lagna (self-image)', 'Dhana pada (wealth)', 'Vikrama pada (courage)', 'Matri pada (home)',
  'Mantra pada (intellect)', 'Roga pada (rivals)', 'Dara pada (partnerships)', 'Mrityu pada (obstacles)',
  'Pitri pada (fortune)', 'Rajya pada (career status)', 'Labha pada (gains)', 'Upapada Lagna (marriage)',
];
const PADA_CODES = ['AL', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'A11', 'UL'];

/** Arudha padas of the twelve houses: count the lord's distance from its house, then the same distance again. */
export function arudhaPadas(chart: Chart): ArudhaPada[] {
  const asc = chart.ascendant.signNumber;
  const signOf = (name: string) => chart.planets.find((p) => p.name === name)!.signNumber;
  return PADA_CODES.map((code, i) => {
    const houseSign = ((asc - 1 + i) % 12) + 1;
    const lord = SIGN_LORDS[houseSign - 1];
    const lordSign = signOf(lord);
    const distance = ((lordSign - houseSign + 12) % 12) + 1;
    let sign = ((lordSign - 1 + distance - 1) % 12) + 1;
    // An arudha falling in the house itself or its 7th moves to the 10th from there.
    if (sign === houseSign || sign === ((houseSign + 5) % 12) + 1) sign = ((sign - 1 + 9) % 12) + 1;
    return {
      house: i + 1, code, name: PADA_NAMES[i], houseSign, lord, lordSign, sign,
      houseFromLagna: ((sign - asc + 12) % 12) + 1,
    };
  });
}

/** Rashi chart carrying the arudha padas (and optionally the planets) as labelled points. */
export function arudhaChart(chart: Chart, padas: ArudhaPada[], includePlanets: boolean): Chart {
  const asc = chart.ascendant.signNumber;
  const points: Position[] = padas.map((p) => ({
    ...chart.ascendant, name: p.code, signNumber: p.sign, sign: SIGN_NAMES[p.sign - 1],
    house: ((p.sign - asc + 12) % 12) + 1, retrograde: false,
  }));
  return { ...chart, planets: includePlanets ? [...chart.planets, ...points] : points };
}
