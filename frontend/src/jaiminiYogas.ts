import { SIGN_NAMES } from './constants';
import { arudhaPadas, charaKarakas } from './jaimini';
import type { Chart, Position } from './types';

export type JaiminiTag = 'marriage' | 'career' | 'spiritual' | 'wealth' | 'self';

export interface JaiminiYoga {
  name: string;
  /** Everyday-language explanation. */
  plain: string;
  /** The rule that triggered it, in astrological terms. */
  technical: string;
  planets: string[];
  tone: 'good' | 'caution' | 'neutral';
  tags: JaiminiTag[];
}

const BENEFICS = ['Jupiter', 'Venus', 'Mercury', 'Moon'];
const MALEFICS = ['Saturn', 'Mars', 'Sun', 'Rahu', 'Ketu'];

const kind = (s: number) => ([1, 4, 7, 10].includes(s) ? 'M' : [2, 5, 8, 11].includes(s) ? 'F' : 'D');

/** Jaimini rashi drishti: movable signs see fixed signs (not the adjacent one), fixed see movable, duals see duals. */
export function rashiAspects(a: number, b: number): boolean {
  if (a === b) return false;
  const ta = kind(a);
  const tb = kind(b);
  if (ta === 'D' && tb === 'D') return true;
  if (ta === 'M' && tb === 'F') return b !== (a % 12) + 1;
  if (ta === 'F' && tb === 'M') return b !== ((a + 10) % 12) + 1;
  return false;
}

const connected = (a: number, b: number) => a === b || rashiAspects(a, b);
const signFrom = (sign: number, house: number) => ((sign - 1 + house - 1) % 12) + 1;
const names = (list: Position[]) => list.map((p) => p.name).join(', ');
/** Picks the singular or plural verb form for a list of planets. */
const verb = (list: Position[], one: string, many: string) => (list.length === 1 ? one : many);

const PAIR_TEXT: Record<string, { name: string; plain: string; tags: JaiminiTag[] }> = {
  'AK-AmK': { name: 'Atmakaraka–Amatyakaraka Raja Yoga', tags: ['career', 'self'], plain: 'Your soul planet and your career planet are connected. Jaimini astrology treats this as the classic recipe for recognition, a respected position and a career that fits who you really are.' },
  'AK-PiK': { name: 'Atmakaraka–Putrakaraka Raja Yoga', tags: ['self'], plain: 'Your soul planet is linked with the planet of intelligence, creativity and children. This supports talent, good judgement and success that comes from using your own mind.' },
  'AmK-PiK': { name: 'Amatyakaraka–Putrakaraka Raja Yoga', tags: ['career'], plain: 'Your career planet is linked with the planet of intelligence and creativity, which favours a professional life built on skill, ideas and guidance of others.' },
  'AK-DK': { name: 'Atmakaraka–Darakaraka Yoga', tags: ['marriage'], plain: 'Your soul planet and your spouse planet are connected, so partnership plays a central role in your life story. A partner often becomes a real support for your growth.' },
  'AmK-DK': { name: 'Amatyakaraka–Darakaraka Yoga', tags: ['marriage', 'career'], plain: 'Your career planet and your spouse planet are connected: a partner can help your career, or your career can bring you to your partner.' },
  'PiK-DK': { name: 'Putrakaraka–Darakaraka Yoga', tags: ['marriage'], plain: 'The planets of creativity and children are linked with your spouse planet, which supports a warm, family-centred marriage.' },
};

/** Planets giving Argala (strong influence) on a sign, after subtracting those that block it. */
function argala(chart: Chart, targetSign: number): { helpers: Position[]; blocked: number } {
  const at = (house: number) => chart.planets.filter((p) => p.signNumber === signFrom(targetSign, house));
  const helpers: Position[] = [];
  let blocked = 0;
  for (const [house, block] of [[2, 12], [4, 10], [11, 3], [5, 9]] as const) {
    const givers = at(house);
    const blockers = at(block);
    if (givers.length > blockers.length) helpers.push(...givers);
    else if (givers.length) blocked += givers.length;
  }
  return { helpers, blocked };
}

export function jaiminiYogas(chart: Chart): JaiminiYoga[] {
  const out: JaiminiYoga[] = [];
  const karakas = charaKarakas(chart);
  const by = Object.fromEntries(karakas.map((k) => [k.code, k.planet])) as Record<string, Position>;
  const padas = arudhaPadas(chart);
  const al = padas[0].sign;
  const ul = padas[11].sign;
  const ak = by.AK;
  const dk = by.DK;
  const karakamsha = ak.navamsaSignNumber;

  for (const key of Object.keys(PAIR_TEXT)) {
    const [x, y] = key.split('-');
    const a = by[x];
    const b = by[y];
    if (!connected(a.signNumber, b.signNumber)) continue;
    const t = PAIR_TEXT[key];
    out.push({
      name: t.name, tags: t.tags, tone: 'good', planets: [a.name, b.name],
      plain: `${t.plain} (Here ${a.name} and ${b.name}.)`,
      technical: `${x} ${a.name} and ${y} ${b.name} are ${a.signNumber === b.signNumber ? 'in the same sign' : 'linked by Jaimini rashi drishti'}.`,
    });
  }

  const strongWord = (p: Position) => (p.dignity === 'EXALTED' ? 'exalted' : p.dignity === 'OWN' ? 'in its own sign' : null);
  if (strongWord(ak)) {
    out.push({
      name: 'Strong Atmakaraka', tags: ['self'], tone: 'good', planets: [ak.name],
      plain: `Your soul planet ${ak.name} is ${strongWord(ak)}. This gives inner confidence, a clear sense of purpose and the ability to stand on your own feet.`,
      technical: `Atmakaraka ${ak.name} is ${strongWord(ak)}.`,
    });
  } else if (ak.dignity === 'DEBILITATED') {
    out.push({
      name: 'Atmakaraka under strain', tags: ['self'], tone: 'caution', planets: [ak.name],
      plain: `Your soul planet ${ak.name} is in a weak position, so growth often comes through learning ${ak.name}'s lessons patiently. It is a sign of effort now and maturity later, not of failure.`,
      technical: `Atmakaraka ${ak.name} is debilitated.`,
    });
  }
  if (strongWord(dk)) {
    out.push({
      name: 'Strong Darakaraka', tags: ['marriage'], tone: 'good', planets: [dk.name],
      plain: `Your spouse planet ${dk.name} is ${strongWord(dk)}, which supports a capable, dependable and supportive life partner.`,
      technical: `Darakaraka ${dk.name} is ${strongWord(dk)}.`,
    });
  } else if (dk.dignity === 'DEBILITATED' || dk.combust) {
    out.push({
      name: 'Darakaraka under strain', tags: ['marriage'], tone: 'caution', planets: [dk.name],
      plain: `Your spouse planet ${dk.name} is ${dk.combust ? 'overpowered by the Sun' : 'weak'}, so the partner or the marriage may need extra patience and understanding to flourish.`,
      technical: `Darakaraka ${dk.name} is ${dk.combust ? 'combust' : 'debilitated'}.`,
    });
  }

  // Argala: planets that strongly influence a house from the 2nd, 4th, 11th and 5th.
  const asc = chart.ascendant.signNumber;
  for (const [house, label, tag] of [[1, 'you and your life direction', 'self'], [7, 'marriage and partnership', 'marriage'], [10, 'career and public life', 'career']] as const) {
    const sign = signFrom(asc, house);
    const { helpers } = argala(chart, sign);
    if (!helpers.length) continue;
    const good = helpers.filter((p) => BENEFICS.includes(p.name));
    const hard = helpers.filter((p) => MALEFICS.includes(p.name));
    const tone = good.length >= hard.length ? 'good' : 'caution';
    out.push({
      name: `Argala on ${house === 1 ? 'the Ascendant' : `the ${house}th house`}`, tags: [tag], tone, planets: helpers.map((p) => p.name),
      plain: `${names(helpers)} actively ${verb(helpers, 'presses', 'press')} on the area of ${label}. ${tone === 'good' ? 'Because helpful planets dominate, this tends to bring support and opportunities from outside.' : 'Because demanding planets dominate, this brings pressure and lessons, so progress comes through effort and patience.'}`,
      technical: `Argala (planets in the 2nd, 4th, 5th or 11th from the sign) on ${SIGN_NAMES[sign - 1]}: ${names(helpers)}, not cancelled by obstructing planets.`,
    });
  }

  // Arudha Lagna: wealth indications from its 2nd and 11th.
  const alGains = chart.planets.filter((p) => [signFrom(al, 2), signFrom(al, 11)].includes(p.signNumber));
  const alGood = alGains.filter((p) => BENEFICS.includes(p.name));
  if (alGood.length) {
    out.push({
      name: 'Dhana yoga from the Arudha Lagna', tags: ['wealth', 'career'], tone: 'good', planets: alGood.map((p) => p.name),
      plain: `${names(alGood)} ${verb(alGood, 'supports', 'support')} the money-and-gains areas counted from your public image (Arudha Lagna). That favours steady income and a good reputation for your work.`,
      technical: `Benefics in the 2nd or 11th from Arudha Lagna ${SIGN_NAMES[al - 1]}.`,
    });
  }
  const alBlessing = chart.planets.filter((p) => ['Jupiter', 'Venus'].includes(p.name) && [signFrom(al, 1), signFrom(al, 5), signFrom(al, 9)].includes(p.signNumber));
  if (alBlessing.length) {
    out.push({
      name: 'Respected public image', tags: ['career', 'self'], tone: 'good', planets: alBlessing.map((p) => p.name),
      plain: `${names(alBlessing)} ${verb(alBlessing, 'favours', 'favour')} the way other people see you (your Arudha Lagna), which helps goodwill, trust and standing in society.`,
      technical: `Jupiter or Venus in the 1st, 5th or 9th from Arudha Lagna.`,
    });
  }

  // Upapada: marriage quality and longevity.
  const ulHelp = chart.planets.filter((p) => BENEFICS.includes(p.name) && connected(p.signNumber, ul));
  if (ulHelp.length) {
    out.push({
      name: 'Blessed Upapada', tags: ['marriage'], tone: 'good', planets: ulHelp.map((p) => p.name),
      plain: `${names(ulHelp)} ${verb(ulHelp, 'influences', 'influence')} your Upapada, the point that shows the marriage itself. That is a good sign for harmony, affection and a respected marriage.`,
      technical: `Benefics in or aspecting Upapada ${SIGN_NAMES[ul - 1]} by rashi drishti.`,
    });
  }
  const secondUl = signFrom(ul, 2);
  const ulHard = chart.planets.filter((p) => MALEFICS.includes(p.name) && p.signNumber === secondUl);
  const ulSupport = chart.planets.filter((p) => BENEFICS.includes(p.name) && p.signNumber === secondUl);
  if (ulHard.length) {
    out.push({
      name: 'Pressure on the marriage-longevity point', tags: ['marriage'], tone: 'caution', planets: ulHard.map((p) => p.name),
      plain: `${names(ulHard)} ${verb(ulHard, 'sits', 'sit')} in the spot that shows how long a marriage lasts (the 2nd from Upapada). This asks for extra care, communication and patience, especially in ${ulHard[0].name}'s periods.`,
      technical: `Malefics in the 2nd from Upapada (${SIGN_NAMES[secondUl - 1]}).`,
    });
  } else if (ulSupport.length) {
    out.push({
      name: 'Lasting marriage indicator', tags: ['marriage'], tone: 'good', planets: ulSupport.map((p) => p.name),
      plain: `${names(ulSupport)} ${verb(ulSupport, 'sits', 'sit')} in the spot that shows how long a marriage lasts (the 2nd from Upapada), which traditionally points to a marriage that endures.`,
      technical: `Benefics in the 2nd from Upapada (${SIGN_NAMES[secondUl - 1]}).`,
    });
  }

  // Karakamsha: the soul's direction.
  const inKaraka = chart.planets.filter((p) => connected(p.navamsaSignNumber, karakamsha));
  const karakaGood = inKaraka.filter((p) => ['Jupiter', 'Venus'].includes(p.name));
  if (karakaGood.length) {
    out.push({
      name: 'Karakamsha blessed by benefics', tags: ['self', 'spiritual', 'wealth'], tone: 'good', planets: karakaGood.map((p) => p.name),
      plain: `${names(karakaGood)} ${verb(karakaGood, 'supports', 'support')} the point that shows your soul's direction (Karakamsha). That favours prosperity, wisdom and a life guided by good values.`,
      technical: `Jupiter or Venus in or aspecting Karakamsha ${SIGN_NAMES[karakamsha - 1]} (Navamsa).`,
    });
  }
  const twelfthK = chart.planets.filter((p) => p.navamsaSignNumber === signFrom(karakamsha, 12) && ['Ketu', 'Jupiter', 'Saturn'].includes(p.name));
  if (twelfthK.length) {
    out.push({
      name: 'Moksha indicator', tags: ['spiritual'], tone: 'good', planets: twelfthK.map((p) => p.name),
      plain: `${names(twelfthK)} ${verb(twelfthK, 'sits', 'sit')} in the part of your soul chart that points to letting go and inner freedom. This traditionally shows a strong pull toward spiritual growth.`,
      technical: `${names(twelfthK)} in the 12th from Karakamsha.`,
    });
  }
  const ketuK = chart.planets.find((p) => p.name === 'Ketu' && connected(p.navamsaSignNumber, karakamsha));
  if (ketuK && !twelfthK.includes(ketuK)) {
    out.push({
      name: 'Ketu on Karakamsha', tags: ['spiritual'], tone: 'neutral', planets: ['Ketu'],
      plain: 'Ketu, the planet of detachment, touches your soul point. People with this often feel drawn to simplicity, research or spiritual practice, and can feel a quiet distance from worldly goals.',
      technical: `Ketu in or aspecting Karakamsha ${SIGN_NAMES[karakamsha - 1]}.`,
    });
  }
  return out;
}
