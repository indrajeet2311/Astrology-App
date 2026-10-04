import type { Chart } from './types';
import {
  EXALTATION_SIGN, MOOLATRIKONA, SEVEN, compoundRelations, signRelation, vargaSign,
} from './vargas';
import type { Relation, Seven } from './vargas';

export type SchemeName = 'Shadvarga' | 'Saptavarga' | 'Dashavarga' | 'Shodashavarga';

// Varga weights per Brihat Parashara Hora Shastra; each scheme sums to 20.
export const SCHEMES: Record<SchemeName, Record<string, number>> = {
  Shadvarga: { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
  Saptavarga: { D1: 5, D2: 2, D3: 3, D7: 2.5, D9: 4.5, D12: 2, D30: 1 },
  Dashavarga: { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
  Shodashavarga: {
    D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5, D16: 2, D20: 0.5, D24: 0.5,
    D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4,
  },
};

// Points (out of 20) a planet earns in a varga by the dignity of the sign it occupies.
type VargaStatus = Relation | 'Exalted' | 'Moolatrikona' | 'Debilitated';
const POINTS: Record<VargaStatus, number> = {
  Exalted: 20, Moolatrikona: 18, Own: 15, 'Adhi Mitra': 10, Mitra: 10, Sama: 7, Shatru: 5, 'Adhi Shatru': 2.5,
  Debilitated: 2.5,
};

export interface VargaPlacement {
  division: string;
  signNumber: number;
  status: VargaStatus;
  points: number;
}

export interface Vimshopaka {
  name: Seven;
  placements: VargaPlacement[];
  scores: Record<SchemeName, number>;
}

export function vimshopaka(chart: Chart): Vimshopaka[] {
  return SEVEN.map((name) => {
    const placements: VargaPlacement[] = Object.keys(SCHEMES.Shodashavarga).map((division) => {
      const signNumber = vargaSign(chart, name, division);
      const divisionRelations = compoundRelations(chart, division);
      const planet = chart.planets.find((p) => p.name === name)!;
      const moola = MOOLATRIKONA[name];
      const status: VargaStatus = signNumber === EXALTATION_SIGN[name] ? 'Exalted'
        : division === 'D1' && signNumber === moola.sign && planet.degreeInSign >= moola.from && planet.degreeInSign < moola.to ? 'Moolatrikona'
          : signNumber === ((EXALTATION_SIGN[name] + 5) % 12) + 1 ? 'Debilitated'
            : signRelation(name, signNumber, divisionRelations);
      return { division, signNumber, status, points: POINTS[status] };
    });
    const pointsOf = (division: string) => placements.find((p) => p.division === division)!.points;
    const scores = {} as Record<SchemeName, number>;
    for (const scheme of Object.keys(SCHEMES) as SchemeName[]) {
      scores[scheme] = Object.entries(SCHEMES[scheme])
        .reduce((sum, [division, weight]) => sum + (weight * pointsOf(division)) / 20, 0);
    }
    return { name, placements, scores };
  });
}

export function vimshopakaGrade(score: number): { label: string; tone: 'good' | 'bad' | 'neutral' } {
  if (score >= 15) return { label: 'Strong', tone: 'good' };
  if (score >= 10) return { label: 'Moderate', tone: 'neutral' };
  return { label: 'Weak', tone: 'bad' };
}
