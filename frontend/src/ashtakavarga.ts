import type { Chart } from './types';

export const AV_PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;
type Contributor = (typeof AV_PLANETS)[number] | 'Lagna';

// Houses (counted from each contributor) in which a benefic point is given, per BPHS.
const TABLE: Record<(typeof AV_PLANETS)[number], Record<Contributor, number[]>> = {
  Sun: {
    Sun: [1, 2, 4, 7, 8, 9, 10, 11], Moon: [3, 6, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [3, 5, 6, 9, 10, 11, 12], Jupiter: [5, 6, 9, 11], Venus: [6, 7, 12],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [3, 4, 6, 10, 11, 12],
  },
  Moon: {
    Sun: [3, 6, 7, 8, 10, 11], Moon: [1, 3, 6, 7, 10, 11], Mars: [2, 3, 5, 6, 9, 10, 11],
    Mercury: [1, 3, 4, 5, 7, 8, 10, 11], Jupiter: [1, 4, 7, 8, 10, 11, 12], Venus: [3, 4, 5, 7, 9, 10, 11],
    Saturn: [3, 5, 6, 11], Lagna: [3, 6, 10, 11],
  },
  Mars: {
    Sun: [3, 5, 6, 10, 11], Moon: [3, 6, 11], Mars: [1, 2, 4, 7, 8, 10, 11], Mercury: [3, 5, 6, 11],
    Jupiter: [6, 10, 11, 12], Venus: [6, 8, 11, 12], Saturn: [1, 4, 7, 8, 9, 10, 11], Lagna: [1, 3, 6, 10, 11],
  },
  Mercury: {
    Sun: [5, 6, 9, 11, 12], Moon: [2, 4, 6, 8, 10, 11], Mars: [1, 2, 4, 7, 8, 9, 10, 11],
    Mercury: [1, 3, 5, 6, 9, 10, 11, 12], Jupiter: [6, 8, 11, 12], Venus: [1, 2, 3, 4, 5, 8, 9, 11],
    Saturn: [1, 2, 4, 7, 8, 9, 10, 11], Lagna: [1, 2, 4, 6, 8, 10, 11],
  },
  Jupiter: {
    Sun: [1, 2, 3, 4, 7, 8, 9, 10, 11], Moon: [2, 5, 7, 9, 11], Mars: [1, 2, 4, 7, 8, 10, 11],
    Mercury: [1, 2, 4, 5, 6, 9, 10, 11], Jupiter: [1, 2, 3, 4, 7, 8, 10, 11], Venus: [2, 5, 6, 9, 10, 11],
    Saturn: [3, 5, 6, 12], Lagna: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  Venus: {
    Sun: [8, 11, 12], Moon: [1, 2, 3, 4, 5, 8, 9, 11, 12], Mars: [3, 5, 6, 9, 11, 12],
    Mercury: [3, 5, 6, 9, 11], Jupiter: [5, 8, 9, 10, 11], Venus: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    Saturn: [3, 4, 5, 8, 9, 10, 11], Lagna: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  Saturn: {
    Sun: [1, 2, 4, 7, 8, 10, 11], Moon: [3, 6, 11], Mars: [3, 5, 6, 10, 11, 12],
    Mercury: [6, 8, 9, 10, 11, 12], Jupiter: [5, 6, 11, 12], Venus: [6, 11, 12],
    Saturn: [3, 5, 6, 11], Lagna: [1, 3, 4, 6, 10, 11],
  },
};

export interface Ashtakavarga {
  /** Bindus per planet per sign (index 0 = Aries). */
  planets: Record<string, number[]>;
  /** Sarvashtakavarga bindus per sign (index 0 = Aries). */
  sarva: number[];
}

export function ashtakavarga(chart: Chart): Ashtakavarga {
  const signOf: Record<Contributor, number> = { Lagna: chart.ascendant.signNumber - 1 } as Record<Contributor, number>;
  for (const name of AV_PLANETS) {
    const p = chart.planets.find((x) => x.name === name);
    if (!p) throw new Error(`Missing planet ${name}`);
    signOf[name] = p.signNumber - 1;
  }
  const planets: Record<string, number[]> = {};
  const sarva = new Array<number>(12).fill(0);
  for (const target of AV_PLANETS) {
    const bindus = new Array<number>(12).fill(0);
    for (const [contributor, houses] of Object.entries(TABLE[target]) as [Contributor, number[]][]) {
      for (const h of houses) bindus[(signOf[contributor] + h - 1) % 12] += 1;
    }
    planets[target] = bindus;
    bindus.forEach((v, i) => { sarva[i] += v; });
  }
  return { planets, sarva };
}
