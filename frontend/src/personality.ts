import { SIGN_NAMES } from './constants';
import { charaKarakas } from './jaimini';
import { HOUSE_THEME, SIGN_TRAITS as GENERAL_SIGN_TRAITS } from './ask/answers';
import type { Chart, Position } from './types';

export interface PersonalityFacet {
  title: string;
  sign: string;
  text: string;
}

export interface ElementBlend {
  dominant: string;
  counts: Record<string, number>;
  text: string;
}

export interface Personality {
  ascendant: PersonalityFacet;
  moon: PersonalityFacet;
  sun: PersonalityFacet;
  atmakaraka: PersonalityFacet;
  nakshatra: PersonalityFacet;
  element: ElementBlend;
  modality: ElementBlend;
  summary: string[];
}

/** How each sign tends to express itself when it is the Ascendant, i.e. the outward personality and approach to life. */
const ASCENDANT_TRAITS = [
  'bold, direct and quick to take the initiative; comes across as energetic and a natural starter of things',
  'calm, steady and grounded; values comfort, patience and building things that last',
  'curious, chatty and adaptable; enjoys variety, ideas and switching between interests',
  'nurturing, intuitive and protective; leads with feeling and is tuned in to the moods of a room',
  'confident, warm and a little dramatic; likes recognition and tends to take charge naturally',
  'precise, observant and service-minded; notices details others miss and likes to be useful',
  'diplomatic, charming and relationship-focused; weighs both sides before deciding',
  'intense, private and determined; keeps a cool exterior while feeling things deeply',
  'optimistic, outspoken and philosophical; enjoys learning, travel and a bit of adventure',
  'disciplined, ambitious and reserved at first meeting; earns trust through consistency',
  'independent-minded, friendly and a little unconventional; drawn to ideas ahead of their time',
  'gentle, imaginative and empathetic; absorbs the feelings of people and places around them',
];
/** How each sign tends to colour the Moon, i.e. the emotional and instinctive inner nature. */
const MOON_TRAITS = [
  'impulsive and spirited emotions that cool down as quickly as they rise',
  'emotionally steady, comfort-seeking and slow to change its mind once settled',
  'restless and curious feelings, often processed by talking them through',
  'deeply sentimental, protective and strongly tied to home and family memories',
  'proud, warm-hearted feelings that want to be seen and appreciated',
  'a careful, slightly worrying mind that feels better once things are organised',
  'feelings shaped by harmony and fairness; uneasy with conflict or being alone',
  'private, intense emotions that run deep and are not easily shown to others',
  'an upbeat, freedom-loving mind that processes feelings through meaning and belief',
  'a reserved, responsible inner world that keeps emotions under careful control',
  'detached, idea-driven feelings; more comfortable with concepts than raw emotion',
  'soft, imaginative and empathetic feelings, easily moved by others and by art',
];
/** How each sign tends to colour the Sun, i.e. core identity, will and vitality. */
const SUN_TRAITS = [
  'a strong need to lead, compete and be first',
  'an identity built around stability, patience and tangible results',
  'a sense of self expressed through versatility, wit and communication',
  'an identity rooted in home, family and emotional security',
  'a confident, generous and recognition-seeking core self',
  'an identity built on usefulness, precision and self-improvement',
  'a sense of self defined through partnership, balance and fairness',
  'a willful, private core that prefers depth over small talk',
  'an identity shaped by big-picture thinking, faith and a love of freedom',
  'a disciplined, status-conscious core built through long-term effort',
  'an identity drawn to causes, groups and being ahead of the curve',
  'a sensitive, idealistic core shaped by compassion and imagination',
];
const ELEMENT_TEXT: Record<string, string> = {
  Fire: 'quick to act, enthusiastic and driven by willpower',
  Earth: 'practical, patient and focused on tangible results',
  Air: 'idea-driven, sociable and happiest when exchanging thoughts',
  Water: 'feeling-led, intuitive and attuned to the emotional undercurrent of situations',
};
const MODALITY_TEXT: Record<string, string> = {
  Cardinal: 'a starter who enjoys initiating projects and new chapters',
  Fixed: 'a sustainer who prefers depth, consistency and seeing things through',
  Mutable: 'an adapter who adjusts easily and bridges different situations or people',
};
const ELEMENTS = ['Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water', 'Fire', 'Earth', 'Air', 'Water'];
const MODALITIES = ['Cardinal', 'Fixed', 'Mutable', 'Cardinal', 'Fixed', 'Mutable', 'Cardinal', 'Fixed', 'Mutable', 'Cardinal', 'Fixed', 'Mutable'];

/** Short personality notes for the Moon's birth nakshatra (Janma nakshatra), the classical seat of the mind and instincts. */
const NAKSHATRA_TRAITS: Record<string, string> = {
  Ashwini: 'quick, pioneering and eager to help; likes to be first and heals fast from setbacks',
  Bharani: 'intense, determined and deeply committed once it takes something on',
  Krittika: 'sharp, critical in a good way and driven to cut through confusion to the truth',
  Rohini: 'charming, sensual and growth-oriented; values beauty, comfort and steady nurturing',
  Mrigashira: 'gentle, searching and curious; always looking for the next interesting thing',
  Ardra: 'intense and transformative; processes difficulty by breaking old patterns down',
  Punarvasu: 'resilient and optimistic; bounces back and finds renewal after setbacks',
  Pushya: 'nurturing, dutiful and protective; a natural caretaker others lean on',
  Ashlesha: 'perceptive, strategic and emotionally intense; reads people very well',
  Magha: 'proud, tradition-minded and drawn to leadership, roots and ancestry',
  'Purva Phalguni': 'warm, pleasure-loving and sociable; enjoys comfort, romance and creativity',
  'Uttara Phalguni': 'generous, dependable and genuinely helpful in relationships',
  Hasta: 'skillful, witty and good with the hands and practical problem-solving',
  Chitra: 'creative, stylish and drawn to designing or shaping things beautifully',
  Swati: 'independent, diplomatic and values personal freedom and balance',
  Vishakha: 'determined and goal-driven; keeps pursuing a target until it is reached',
  Anuradha: 'loyal, friendly and good at building lasting partnerships and networks',
  Jyeshtha: 'protective, responsible and comfortable taking charge of others',
  Mula: 'investigative and root-seeking; wants to get to the core of things, even if it is disruptive',
  'Purva Ashadha': 'confident, persuasive and hard to defeat once committed to a direction',
  'Uttara Ashadha': 'principled, steady and plays a long game toward lasting achievement',
  Shravana: 'a good listener and learner; absorbs knowledge and connects people',
  Dhanishtha: 'energetic, ambitious and drawn to music, rhythm and group recognition',
  Shatabhisha: 'independent, a little secretive and drawn to healing or unconventional ideas',
  'Purva Bhadrapada': 'intense, idealistic and willing to sacrifice comfort for a bigger purpose',
  'Uttara Bhadrapada': 'calm, wise and quietly deep; comfortable sitting with complexity',
  Revati: 'compassionate, gentle and happiest guiding others safely to where they are going',
};

function signTitle(signNumber: number): string {
  return SIGN_NAMES[signNumber - 1];
}

function blend(planets: Position[], table: string[]): ElementBlend {
  const counts: Record<string, number> = {};
  for (const p of planets) {
    const key = table[p.signNumber - 1];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  return { dominant, counts, text: (table === ELEMENTS ? ELEMENT_TEXT : MODALITY_TEXT)[dominant] };
}

/** A personality profile built from the Ascendant, Moon, Sun, Atmakaraka and element/modality balance of the chart. */
export function personality(chart: Chart): Personality {
  const moon = chart.planets.find((p) => p.name === 'Moon')!;
  const sun = chart.planets.find((p) => p.name === 'Sun')!;
  const ak = charaKarakas(chart)[0];
  const corePlanets = [chart.ascendant, ...chart.planets.filter((p) => ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].includes(p.name))];
  const element = blend(corePlanets, ELEMENTS);
  const modality = blend(corePlanets, MODALITIES);

  const ascendant: PersonalityFacet = {
    title: 'Ascendant (Lagna) — how you come across',
    sign: signTitle(chart.ascendant.signNumber),
    text: ASCENDANT_TRAITS[chart.ascendant.signNumber - 1],
  };
  const moonFacet: PersonalityFacet = {
    title: 'Moon — your emotional nature',
    sign: signTitle(moon.signNumber),
    text: MOON_TRAITS[moon.signNumber - 1],
  };
  const sunFacet: PersonalityFacet = {
    title: 'Sun — your core identity',
    sign: signTitle(sun.signNumber),
    text: SUN_TRAITS[sun.signNumber - 1],
  };
  const atmakaraka: PersonalityFacet = {
    title: `Atmakaraka — ${ak.planet.name}, your soul's driving motivation`,
    sign: signTitle(ak.planet.signNumber),
    text: `${ak.planet.name} is the planet at the highest degree in your chart, in ${signTitle(ak.planet.signNumber)} in house ${ak.planet.house}. In Jaimini astrology this is the soul significator: it points to the deepest motivation and life lesson for this birth — a nature that is ${GENERAL_SIGN_TRAITS[ak.planet.signNumber - 1]}, working itself out through ${HOUSE_THEME[ak.planet.house]}.`,
  };
  const nakshatraFacet: PersonalityFacet = {
    title: `Janma Nakshatra — ${moon.nakshatra}${moon.pada ? ` pada ${moon.pada}` : ''}`,
    sign: signTitle(moon.signNumber),
    text: NAKSHATRA_TRAITS[moon.nakshatra] ?? 'a distinctive instinctive nature shaped by this Moon placement.',
  };

  const summary: string[] = [
    `With ${ascendant.sign} rising, you tend to be ${ascendant.text}.`,
    `Your Moon in ${moonFacet.sign} gives you ${moonFacet.text}.`,
    `Your Sun in ${sunFacet.sign} points to ${sunFacet.text}.`,
    `Your birth nakshatra, ${moon.nakshatra}, adds a streak of being ${nakshatraFacet.text}.`,
    `${ak.planet.name} as your Atmakaraka suggests your life's deeper purpose is shaped by a ${GENERAL_SIGN_TRAITS[ak.planet.signNumber - 1]} nature, working itself out through ${HOUSE_THEME[ak.planet.house]}.`,
    `Overall, ${element.dominant} is the strongest element among your core planets (${element.text}), expressed in a ${modality.dominant.toLowerCase()} way — ${modality.text}.`,
  ];

  return { ascendant, moon: moonFacet, sun: sunFacet, atmakaraka, nakshatra: nakshatraFacet, element, modality, summary };
}
