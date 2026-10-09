/**
 * Plain-English meanings for planet-to-planet combinations (conjunction or aspect).
 * One short phrase per unordered pair of the 9 grahas, reused for both conjunctions
 * and aspects so the app can show a human reading instead of raw chart mechanics.
 * Keep each entry short — these are blended into a single sentence at call sites.
 */

const MEANINGS: Record<string, string> = {
  'Moon-Sun': 'mixes ego and emotion — moods and self-image are closely linked',
  'Mars-Sun': 'adds drive and confidence, but also a short temper',
  'Mercury-Sun': 'sharp, confident thinking and clear self-expression',
  'Jupiter-Sun': 'boosts self-belief, wisdom and respect from others',
  'Sun-Venus': 'charm and warmth, though pride can affect relationships',
  'Saturn-Sun': 'duty and responsibility weigh on confidence; recognition comes slowly but lasts',
  'Rahu-Sun': 'strong ambition, but a restless need for recognition',
  'Ketu-Sun': 'a detached, humble relationship with authority and ego',
  'Mars-Moon': 'quick emotional reactions; passionate but sometimes impulsive feelings',
  'Mercury-Moon': 'an emotionally expressive mind; thoughts led by feelings',
  'Jupiter-Moon': 'emotional warmth, generosity and optimism',
  'Moon-Venus': 'a caring, affectionate nature with a love for comfort and beauty',
  'Moon-Saturn': 'emotional restraint; feelings are controlled or sometimes heavy',
  'Moon-Rahu': 'restless emotions and an unusual, changeable inner life',
  'Ketu-Moon': 'emotional detachment or a dreamy, private inner world',
  'Mars-Mercury': 'sharp, quick, decisive communication — blunt and to the point',
  'Jupiter-Mars': 'confident, bold action guided by principle',
  'Mars-Venus': 'a passionate mix of desire and attraction',
  'Mars-Saturn': 'friction between action and patience; effort pays off, but slowly',
  'Mars-Rahu': 'aggressive ambition; drive that can override caution',
  'Ketu-Mars': 'impulsive energy that can suddenly withdraw or lose focus',
  'Jupiter-Mercury': 'a wise, broad-minded and persuasive way of thinking',
  'Mercury-Venus': 'a diplomatic, pleasant and artistic communication style',
  'Mercury-Saturn': 'serious, methodical thinking — practical, but prone to overthinking',
  'Mercury-Rahu': 'a clever, unconventional, sometimes restless mind',
  'Ketu-Mercury': 'a detached or scattered way of thinking at times',
  'Jupiter-Venus': 'a generous, optimistic approach to love, money and relationships',
  'Jupiter-Saturn': 'balances optimism with discipline — steady, long-term growth',
  'Jupiter-Rahu': 'big ambitions, sometimes larger than what is practical',
  'Jupiter-Ketu': 'wisdom that favours spiritual growth over material gain',
  'Saturn-Venus': 'loyalty and commitment, though affection can feel delayed or reserved',
  'Rahu-Venus': 'an intense, unconventional pull toward pleasure and relationships',
  'Ketu-Venus': 'a detached approach to love and comfort, with little pull toward material pleasure',
  'Rahu-Saturn': 'persistent ambition mixed with anxiety — success through sustained effort',
  'Ketu-Saturn': 'a serious, withdrawn nature; disciplined but can feel isolated',
  'Ketu-Rahu': 'a built-in push-and-pull of ambition and release — growth through balancing both',
};

function key(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/**
 * Short, plain meaning for two planets being close together (conjunction) or linked by aspect.
 * Returns undefined for pairs outside the 9 classical grahas (or a planet paired with itself).
 */
export function comboMeaning(a: string, b: string): string | undefined {
  if (a === b) return undefined;
  return MEANINGS[key(a, b)];
}
