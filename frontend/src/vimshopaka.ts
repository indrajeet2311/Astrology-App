import type { Chart } from './types';
import { SEVEN, compoundRelations, signRelation, vargaSign } from './vargas';
import type { Relation, Seven } from './vargas';

export type SchemeName = 'Shadvarga' | 'Saptavarga' | 'Dashavarga' | 'Shodashavarga';

// Varga weights per Brihat Parashara Hora Shastra; each scheme sums to 20.
export const SCHEMES: Record<SchemeName, Record<string, number>> = {
  Shadvarga: { D1: 6, D2: 2, D3: 4, D9: 5, D12: 2, D30: 1 },
  Saptavarga: { D1: 5, D2: 2, D3: 3, D7: 1, D9: 2.5, D12: 4.5, D30: 2 },
  Dashavarga: { D1: 3, D2: 1.5, D3: 1.5, D7: 1.5, D9: 1.5, D10: 1.5, D12: 1.5, D16: 1.5, D30: 1.5, D60: 5 },
  Shodashavarga: {
    D1: 3.5, D2: 1, D3: 1, D4: 0.5, D7: 0.5, D9: 3, D10: 0.5, D12: 0.5, D16: 2, D20: 0.5, D24: 0.5,
    D27: 0.5, D30: 1, D40: 0.5, D45: 0.5, D60: 4,
  },
};

// JHora scores only the five-fold relationship to the varga sign lord; exaltation is not counted.
type VargaStatus = Relation;
const POINTS: Record<VargaStatus, number> = {
  Own: 20, 'Adhi Mitra': 18, Mitra: 15, Sama: 10, Shatru: 7, 'Adhi Shatru': 5,
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
  const relations = Object.fromEntries(Object.keys(SCHEMES.Shodashavarga)
    .map((division) => [division, compoundRelations(chart, division)]));
  return SEVEN.map((name) => {
    const placements: VargaPlacement[] = Object.keys(SCHEMES.Shodashavarga).map((division) => {
      const signNumber = vargaSign(chart, name, division);
      const status = signRelation(name, signNumber, relations[division]);
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
