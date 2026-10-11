import { SIGN_LORDS, SIGN_NAMES } from '../constants';
import { rashiAspects } from '../jaiminiYogas';
import {
  aspectors, BENEFICS, lordOfHouse, MALEFICS, occupants, planet,
  vargaAspectors, vargaHouseOf, vargaLord, vargaOccupants, vargaSign, vargaStatus,
} from './core';
import type { Context, Tone } from './core';
import type { Answer, DomainId } from './answers';

export interface BookFinding {
  id: string;
  title: string;
  text: string;
  tone: Tone;
  rule: string;
  book: string;
  pdfPages: string;
  evidence: string;
  charts: string[];
}

export interface BookTiming {
  start: string;
  end: string;
  tone: 'good' | 'caution';
  text: string;
  system: 'Vimshottari' | 'Chara';
  evidence: string;
}

export const TOPIC_DIVISION: Record<DomainId, string> = {
  marriage: 'D9', relationship: 'D9', career: 'D10', children: 'D7',
  property: 'D4', spiritual: 'D20', health: 'D30',
};
const COMPREHENSIVE = 'V. P. Goel, Comprehensive Prediction by Divisional Charts';
const NAVAMSA = 'V. P. Goel, Predict with Navamsha';
const CAREER = 'V. P. Goel, Predict with Dashamsha';
const CHILDREN = 'V. P. Goel, Predict with Saptamsha';
const TRIK = [6, 8, 12];
const ANGLES_TRINES = [1, 4, 5, 7, 9, 10];
const CAREER_STYLES = [
  'Self-employment, leadership or building an organisation is indicated as a working style.',
  'Food-related work, a family business or work relying on speech is indicated.',
  'Communication, writing, contracts and short work trips are indicated, with scope for frequent role changes.',
  'Authority and recognition through work close to your home base are indicated.',
  'Frequent job changes or disagreements with managers are indicated as a recurring career theme.',
  'Employment and service work, particularly addressing practical problems such as disputes, debt or healthcare, are indicated.',
  'Business skills, corporate work, clients or partnerships are important themes in your earnings.',
  'An uncertain professional path with significant challenges and changes is indicated.',
  'Family influence or a family business can shape your career, alongside changes of role or location.',
  'Professional distinction and a visible reputation are indicated.',
  'More than one professional activity and opportunities to create work for others are indicated.',
  'Foreign-linked work, institutions or work in secluded settings are indicated.',
];
const EDUCATION_FIELDS = [
  'engineering, emergency services or competitive sport',
  'banking, fashion or music',
  'accountancy, writing or translation',
  'biology, nursing or hospitality',
  'government administration, investment or directing',
  'accounting, computing or editing',
  'law, management consulting or design',
  'chemistry, investigative work or insurance',
  'law, finance or social advocacy',
  'geology, agriculture or executive management',
  'electrical engineering, computing or invention',
  'social work, healthcare or film-making',
];
const STAR_LORDS = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];

export function validateReadingChart(ctx: Context, domain: DomainId): void {
  const required = new Set([TOPIC_DIVISION[domain]]);
  if (domain === 'children') required.add('D9');
  for (const name of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    if (!ctx.chart.planets.some((position) => position.name === name)) {
      throw new Error(`The birth chart is missing ${name}. Recalculate the chart before asking a question.`);
    }
  }
  for (const position of [ctx.chart.ascendant, ...ctx.chart.planets]) {
    if (!Number.isInteger(position.signNumber) || position.signNumber < 1 || position.signNumber > 12) {
      throw new Error('The birth chart contains an invalid sign. Recalculate it before asking a question.');
    }
    if (position !== ctx.chart.ascendant && (!Number.isInteger(position.house) || position.house < 1 || position.house > 12)) {
      throw new Error(`The birth chart has an invalid house for ${position.name}. Recalculate it before asking a question.`);
    }
    if (!Number.isFinite(position.longitude) || position.longitude < 0 || position.longitude >= 360) {
      throw new Error(`The birth chart has an invalid longitude for ${position.name ?? 'Ascendant'}. Recalculate it before asking a question.`);
    }
    for (const division of required) {
      const sign = position.divisionalSigns[division];
      if (!Number.isInteger(sign) || sign < 1 || sign > 12) {
        throw new Error(`The ${division} chart is incomplete for ${position.name ?? 'Ascendant'}. Recalculate the birth chart before generating a reading.`);
      }
    }
  }
}

const houseOf = (ctx: Context, name: string, division: string) =>
  division === 'D1' ? planet(ctx, name).house : vargaHouseOf(ctx, name, division);
const lord = (ctx: Context, house: number, division: string) =>
  division === 'D1' ? lordOfHouse(ctx, house) : vargaLord(ctx, division, house);
const inHouse = (ctx: Context, house: number, division: string) =>
  division === 'D1' ? occupants(ctx, house) : vargaOccupants(ctx, division, house);
const aspects = (ctx: Context, house: number, division: string) =>
  division === 'D1' ? aspectors(ctx, house) : vargaAspectors(ctx, division, house);
const influences = (ctx: Context, house: number, division: string) =>
  [...new Set([...inHouse(ctx, house, division), ...aspects(ctx, house, division)])];
const status = (ctx: Context, name: string, division: string) =>
  division === 'D1' ? planet(ctx, name).dignity : vargaStatus(ctx, name, division);
const strong = (ctx: Context, name: string, division: string) =>
  ['EXALTED', 'OWN', 'Exalted', 'Own'].includes(status(ctx, name, division) ?? '');
const connections = (ctx: Context, name: string, division: string) =>
  influences(ctx, houseOf(ctx, name, division), division).filter((other) => other !== name);
const linked = (ctx: Context, a: string, b: string, division: string) =>
  a === b || connections(ctx, a, division).includes(b) || connections(ctx, b, division).includes(a);
const related = (ctx: Context, name: string, house: number, division: string) =>
  name === lord(ctx, house, division) || influences(ctx, house, division).includes(name)
  || linked(ctx, name, lord(ctx, house, division), division);

// House-lord association is explicitly protective in the D9 marriage rules.
function houseCondition(ctx: Context, house: number, division: string) {
  const names = influences(ctx, house, division);
  const owner = lord(ctx, house, division);
  const support = names.filter((name) => BENEFICS.includes(name) || name === owner);
  const pressure = names.filter((name) => MALEFICS.includes(name) && name !== owner);
  return { support, pressure };
}

function planetCondition(ctx: Context, name: string, division: string) {
  const names = connections(ctx, name, division);
  return {
    support: names.filter((other) => BENEFICS.includes(other)),
    pressure: names.filter((other) => MALEFICS.includes(other)),
  };
}

export function evaluateBookFindings(ctx: Context, domain: DomainId): BookFinding[] {
  validateReadingChart(ctx, domain);
  const findings: BookFinding[] = [];
  const primaryHouse = { marriage: 7, relationship: 7, career: 10, children: 5, property: 4, spiritual: 9, health: 1 }[domain];
  const division = TOPIC_DIVISION[domain];
  const natalLord = lordOfHouse(ctx, primaryHouse);
  const natalContext = `D1 H${primaryHouse}: occupants ${occupants(ctx, primaryHouse).join('/') || 'none'}, aspects ${aspectors(ctx, primaryHouse).join('/') || 'none'}; D1 topic lord ${natalLord}: H${planet(ctx, natalLord).house}, ${planet(ctx, natalLord).dignity ?? 'ordinary dignity'}; carried into ${division}: H${vargaHouseOf(ctx, natalLord, division)}, ${vargaStatus(ctx, natalLord, division)}`;
  const add = (matched: boolean, id: string, title: string, text: string, tone: Tone,
    rule: string, book: string, pdfPages: string, evidence: string) => {
    if (!matched) return;
    findings.push({ id, title, text, tone, rule, book, pdfPages,
      evidence: `${natalContext}; matched condition: ${evidence}`, charts: ['D1', division] });
  };

  if (domain === 'marriage' || domain === 'relationship') {
    const foundations = [1, 2, 7].map((house) => ({ house, ...houseCondition(ctx, house, 'D9') }));
    const supported = foundations.every((item) => item.support.length > 0 && !item.pressure.length);
    const pressured = foundations.every((item) => item.pressure.length > 0 && !item.support.length);
    const natalPromise = houseCondition(ctx, 7, 'D1');
    const natalSupportsMarriage = natalPromise.support.length > 0;
    add((supported && natalSupportsMarriage) || pressured, 'marriage-readiness', 'Marriage prospects', supported && natalSupportsMarriage
      ? 'Marriage is supported by both your overall relationship indications and your longer-term partnership pattern.'
      : pressured
        ? 'Marriage is indicated as a more demanding area: personal adjustment, family involvement and commitment may contribute to delay.'
        : 'The commitment picture is mixed. Give personal readiness, family expectations and the relationship itself equal attention.',
    supported ? 'good' : pressured ? 'bad' : 'neutral', 'D1 promise with D9 first, second and seventh house associations', COMPREHENSIVE, '143–144',
    `D1 seventh protective ${natalPromise.support.join('/') || 'none'}; ` + foundations.map((item) => `D9 H${item.house}: protective ${item.support.join('/') || 'none'}; pressure ${item.pressure.join('/') || 'none'}`).join('; '));

    const quality = (division: string) => {
      const condition = houseCondition(ctx, 7, division);
      const naturalSupport = condition.support.filter((name) => BENEFICS.includes(name));
      const partnershipLord = lord(ctx, 7, division);
      const lordPressure = planetCondition(ctx, partnershipLord, division);
      return naturalSupport.length >= 2 && !condition.pressure.length ? 'support'
        : TRIK.includes(houseOf(ctx, partnershipLord, division)) && lordPressure.pressure.length >= 2
          && !lordPressure.support.length ? 'pressure' : 'mixed';
    };
    const early = quality('D1');
    const mature = quality('D9');
    add(mature !== 'mixed', 'marriage-quality', 'How married life may develop',
      early === 'support' && mature === 'pressure'
        ? 'The relationship can begin positively, but married life is likely to become more demanding after the initial phase.'
        : early === 'pressure' && mature === 'support'
          ? 'The beginning of the relationship may be difficult, but married life is indicated to improve as the bond settles.'
          : mature === 'support'
            ? 'A cooperative, supportive married life is indicated, with more scope for mutual understanding over time.'
            : mature === 'pressure'
              ? 'Daily married life is likely to involve recurring adjustment or disagreement rather than an entirely smooth partnership.'
              : 'There is no clear indication that married life must steadily improve or worsen. The checks are mixed; how both people handle daily life matters.',
      mature === 'support' ? 'good' : mature === 'pressure' ? 'bad' : 'neutral',
      'D1/D9 seventh-house benefic quality; seventh-lord difficult placement with multiple malefic associations', NAVAMSA + '; ' + COMPREHENSIVE, 'Navamsha 22–23; Comprehensive 155',
      `D1 seventh-house quality ${early}; D9 ${mature}. Mixed influences remain mixed; no gender-specific significator assumed.`);

    const seventh = vargaLord(ctx, 'D9', 7);
    const caring = [seventh, 'Venus'].some((name) => {
      const condition = planetCondition(ctx, name, 'D9');
      const self = vargaLord(ctx, 'D9', 1);
      return condition.support.length > 0 && condition.pressure.every((other) => other === self);
    });
    add(caring, 'marriage-care', 'Spouse and companionship', caring
      ? 'A caring partner who provides practical support and attends to your needs is indicated.'
      : 'Care and companionship are not strongly confirmed by the checks used here. This does not judge a future partner: look for kindness, reliability and mutual respect in real life.',
    caring ? 'good' : 'neutral', 'Benefic-only association with Venus or the D9 seventh lord', COMPREHENSIVE, '153',
    [seventh, 'Venus'].map((name) => `${name}: associates ${connections(ctx, name, 'D9').join('/') || 'none'}`).join('; '));

    const family = houseCondition(ctx, 2, 'D9');
    add(family.pressure.length > 0, 'marriage-family', 'Family life and communication', family.pressure.length && !family.support.length
      ? 'Family involvement, speech or money discussions are likely sources of tension in married life.'
      : family.support.length && !family.pressure.length
        ? 'Family adjustment and communication have support. Honest conversations about finances can help create a steadier home life.'
        : 'Family and money discussions can bring tension, but there is also support for resolving disagreements rather than letting them define the marriage.',
    family.pressure.length && !family.support.length ? 'bad' : family.support.length && !family.pressure.length ? 'good' : 'neutral',
    'D9 second house: speech and family tensions', COMPREHENSIVE, '143',
    `D9 H2 protective ${family.support.join('/') || 'none'}; pressure ${family.pressure.join('/') || 'none'}`);

    const married = [...new Set([seventh, 'Venus'])].map((name) => {
      const house = vargaHouseOf(ctx, name, 'D9');
      const condition = planetCondition(ctx, name, 'D9');
      return { name, house, ...condition };
    });
    const difficult = (item: typeof married[number]) => TRIK.includes(item.house)
      && !(item.name === 'Venus' && item.house === 12);
    const recovery = married.some((item) => difficult(item) && item.pressure.length && item.support.length);
    const strain = married.some((item) => difficult(item) && item.pressure.length && !item.support.length);
    const prosperity = married.some((item) => [2, 3, 6, 10, 11].includes(item.house) && item.support.length && !item.pressure.length);
    add(recovery || strain || prosperity, 'marriage-after', 'Life after marriage', recovery
      ? 'Married life may pass through strain, followed by scope for recovery and reconciliation.'
      : strain
        ? 'Shared responsibilities and emotional adjustment are likely to make married life demanding at times.'
        : prosperity
          ? 'Greater material comfort and improvement in shared finances after marriage are indicated.'
          : 'The checks do not establish a clear change in prosperity after marriage. Build your plans around actual finances and shared goals.',
    recovery ? 'neutral' : strain ? 'bad' : prosperity ? 'good' : 'neutral',
    'Post-marriage placement, affliction and benefic mitigation', COMPREHENSIVE, '155',
    married.map((item) => `${item.name} D9 H${item.house}; support ${item.support.join('/') || 'none'}; pressure ${item.pressure.join('/') || 'none'}`).join('; '));
  } else if (domain === 'career') {
    const self = lordOfHouse(ctx, 1);
    const profession = lordOfHouse(ctx, 10);
    const supported = [self, profession].every((name) =>
      strong(ctx, name, 'D10') && !TRIK.includes(vargaHouseOf(ctx, name, 'D10'))
      && !planet(ctx, name).combust && !planetCondition(ctx, name, 'D10').pressure.length);
    const challenged = [self, profession].some((name) =>
      TRIK.includes(vargaHouseOf(ctx, name, 'D10')) && planetCondition(ctx, name, 'D10').pressure.length);
    add(supported || challenged, 'career-foundation', 'Career stability', supported
      ? 'A comparatively steady career with scope for recognition is indicated. Your ability to carry responsibility supports professional progress.'
      : challenged
        ? 'Career progress is likely to involve obstacles or demanding transitions rather than a continuously smooth path.'
        : 'Your professional foundation has mixed indications. Choose work where your skills can develop and make progress through steady effort.',
    supported ? 'good' : challenged ? 'bad' : 'neutral',
    'Natal first/tenth lords examined in D10', COMPREHENSIVE, '170',
    [self, profession].map((name) => `${name}: D10 ${vargaStatus(ctx, name, 'D10')}, H${vargaHouseOf(ctx, name, 'D10')}`).join('; '));

    const rising = (division: string) =>
      inHouse(ctx, 10, division).length > 0 && [3, 6, 11].filter((house) => inHouse(ctx, house, division).length > 0).length >= 2;
    const rise = rising('D1') && rising('D10');
    add(rise, 'career-growth', 'Growth and recognition', rise
      ? 'Professional advancement through sustained effort is indicated, with increasing responsibility and visibility over time.'
      : 'The specific repeated-growth pattern is not fully present. Advancement is still possible; focus on measurable results rather than expecting an automatic rise.',
    rise ? 'good' : 'neutral', 'Occupied growth houses in natal and D10 charts', CAREER, '101–102',
    `H10 occupied and at least two of H3/H6/H11 occupied: D1 ${rising('D1')}, D10 ${rising('D10')}. Other rise methods are not inferred.`);

    const setbacks = (division: string) => {
      const tenth = lord(ctx, 10, division);
      const difficult = TRIK.map((house) => lord(ctx, house, division)).filter((name) => name !== tenth);
      return TRIK.includes(houseOf(ctx, tenth, division))
        || difficult.some((name) => influences(ctx, 10, division).includes(name) || linked(ctx, name, tenth, division));
    };
    const fall = setbacks('D1') && setbacks('D10');
    add(fall, 'career-setbacks', 'Changes and setbacks', fall
      ? 'Career breaks, changes in responsibility or interruptions to progress are indicated in both the overall and professional patterns.'
      : 'A repeated setback pattern is not confirmed in both checks. Normal changes can still happen, so keep skills current and avoid overcommitting.',
    fall ? 'bad' : 'neutral', 'Tenth-house/tenth-lord difficult-house relations repeated in D10', CAREER, '129–130',
    `D1 difficult career relation ${setbacks('D1')}; D10 ${setbacks('D10')}`);

    const rewardPressure = (house: number, division: string) => {
      const owner = lord(ctx, house, division);
      return TRIK.includes(houseOf(ctx, owner, division))
        && ![5, 9].some((trine) => linked(ctx, owner, lord(ctx, trine, division), division));
    };
    const earningsPressure = rewardPressure(11, 'D1') && rewardPressure(11, 'D10');
    const savingsPressure = rewardPressure(2, 'D1') && rewardPressure(2, 'D10');
    add(earningsPressure || savingsPressure, 'career-earnings', 'Earnings and savings', earningsPressure || savingsPressure
      ? `${earningsPressure ? 'Professional gains are likely to be uneven or harder to realise.' : ''} ${savingsPressure ? 'Accumulating and retaining savings may also be difficult.' : ''}`.trim()
      : 'The specific repeated obstacles to earnings and savings are not confirmed. That is not a promise of higher pay: negotiate using your skills, results and actual market rates.',
    earningsPressure || savingsPressure ? 'bad' : 'neutral',
    'Second/eleventh lord in difficult houses without a trine-lord connection, repeated in D10', CAREER, '130',
    `Repeated H11 reward pressure ${earningsPressure}; repeated H2 savings pressure ${savingsPressure}`);

    const independent = (division: string) => {
      const pp = ['Sun', 'Moon', 'Mars', 'Rahu'];
      const qualifying = pp.filter((name) => [1, 10].some((house) => related(ctx, name, house, division)));
      const hemispheres = [[7, 8, 9, 10, 11, 12], [10, 11, 12, 1, 2, 3]];
      const cluster = hemispheres.some((houses) => {
        const names = ctx.chart.planets.filter((position) => houses.includes(houseOf(ctx, position.name, division))).map((position) => position.name);
        return names.length >= 5 && names.filter((name) => pp.includes(name)).length >= 2;
      });
      return { qualifying, cluster };
    };
    const natal = independent('D1');
    const professional = independent('D10');
    const autonomy = natal.qualifying.length >= 2 && professional.qualifying.length >= 2 && professional.cluster;
    const initiative = related(ctx, vargaLord(ctx, 'D10', 3), 10, 'D10');
    add(autonomy, 'career-independence', 'Independent work', autonomy
      ? 'A self-directed working style and a need for autonomy are indicated. This supports independent responsibility, but does not by itself settle business versus salaried employment.'
      : 'The independent-work checks are mixed. A structured role may be a useful starting point; this does not rule out building a business later.',
    autonomy ? 'good' : 'neutral', 'Independent planets, five-planet grouping and initiative link', CAREER, '65–66',
    `D1 independent influences ${natal.qualifying.join('/')}; D10 ${professional.qualifying.join('/')}; D10 five-planet grouping ${professional.cluster}; H3/H10 connection ${initiative}. Saturn classification/planetary war not inferred.`);

    const partner = vargaLord(ctx, 'D10', 7);
    const tenth = vargaLord(ctx, 'D10', 10);
    const partnership = related(ctx, partner, 10, 'D10') || related(ctx, tenth, 7, 'D10');
    const strain = [partner, tenth].some((name) => [3, 5, 9, 6, 8, 12].includes(vargaHouseOf(ctx, name, 'D10')) || planetCondition(ctx, name, 'D10').pressure.length);
    const gain = [partner, tenth].some((name) => related(ctx, name, 11, 'D10'));
    add(partnership, 'career-partnership', 'Business partnerships', partnership && !strain && gain
      ? 'Business through partnership is indicated, with scope for gains from collaboration.'
      : partnership && strain
        ? 'Business partnership is indicated, but it can bring disagreements, financial pressure or difficulty sustaining the arrangement.'
        : partnership
          ? 'Working through clients or business partners is indicated. The matched partnership rule alone does not establish financial gains.'
          : 'A business partnership is not clearly confirmed by these checks. Do not assume a partner will improve the business; compare it with working independently.',
    partnership && !strain && gain ? 'good' : partnership && strain ? 'bad' : 'neutral',
    'D10 seventh/tenth connection, difficult placements and eleventh-house gains', CAREER, '161–162',
    `D10 H7/H10 connection ${partnership}; placement/association pressure ${strain}; H11 connection ${gain}`);

    const workHouse = vargaHouseOf(ctx, tenth, 'D10');
    const workCondition = planetCondition(ctx, tenth, 'D10');
    const weakened = workCondition.pressure.length > 0 || vargaStatus(ctx, tenth, 'D10') === 'Debilitated' || planet(ctx, tenth).combust;
    const mitigated = weakened && workCondition.support.length > 0;
    const modifier = mitigated
      ? ' There are obstacles, but supportive influences provide scope for recovery.'
      : weakened ? ' Pressure on this pattern can make progress less smooth.'
        : workCondition.support.length ? ' Supportive influences strengthen this direction.' : '';
    add(true, 'career-style', 'Your working pattern', CAREER_STYLES[workHouse - 1] + modifier,
      weakened && !mitigated ? 'bad' : 'neutral', 'D10 tenth-lord placement, modified by dignity and associations', CAREER, '22–34',
      `Natal tenth lord ${profession}: D10 H${vargaHouseOf(ctx, profession, 'D10')}; D10 tenth lord ${tenth}: H${workHouse}, ${vargaStatus(ctx, tenth, 'D10')}; support ${workCondition.support.join('/') || 'none'}; pressure ${workCondition.pressure.join('/') || 'none'}; combust ${planet(ctx, tenth).combust}`);

    const educationLord = lordOfHouse(ctx, 5);
    const starLord = STAR_LORDS[Math.floor(planet(ctx, educationLord).longitude / (360 / 27)) % 9];
    const professionalLink = related(ctx, starLord, 10, 'D10') || starLord === vargaLord(ctx, 'D10', 1);
    const fieldCondition = planetCondition(ctx, starLord, 'D10');
    const fieldsSupported = professionalLink && !TRIK.includes(vargaHouseOf(ctx, starLord, 'D10'))
      && !fieldCondition.pressure.length && !planet(ctx, starLord).combust;
    add(fieldsSupported, 'career-fields', 'Career direction', `Your education-to-career pattern points toward ${EDUCATION_FIELDS[planet(ctx, starLord).signNumber - 1]}. These are linked professional themes, not a guarantee of one exact occupation.`,
      'good', 'Star lord of natal fifth lord analysed in D1 and carried to D10; sign-based avocation', CAREER, '40–46',
      `D1 fifth lord ${educationLord}: longitude ${planet(ctx, educationLord).longitude}, star lord ${starLord}, D1 sign ${planet(ctx, starLord).signNumber}; ${starLord} D10 H${vargaHouseOf(ctx, starLord, 'D10')}; profession connection ${professionalLink}; support ${fieldCondition.support.join('/') || 'none'}; pressure ${fieldCondition.pressure.join('/') || 'none'}`);
  } else if (domain === 'children') {
    const self = vargaLord(ctx, 'D7', 1);
    const condition = planetCondition(ctx, self, 'D7');
    const supported = (strong(ctx, self, 'D7') || ANGLES_TRINES.includes(vargaHouseOf(ctx, self, 'D7')) || condition.support.length > 0)
      && !TRIK.includes(vargaHouseOf(ctx, self, 'D7')) && !condition.pressure.length;
    const natalFamily = houseCondition(ctx, 5, 'D1');
    const natalInfluences = influences(ctx, 5, 'D1');
    const natalSupported = natalFamily.support.length > 0 || natalInfluences.includes(lordOfHouse(ctx, 1))
      || natalInfluences.includes('Jupiter') || natalInfluences.length === 0;
    add(supported && natalSupported, 'parenting-foundation', 'Parenting and family life', supported
      ? 'A stable foundation for raising and guiding children is indicated, with capacity to manage family responsibilities.'
      : 'Family responsibilities may need extra planning and teamwork. Share the workload and seek practical support rather than treating this as a judgment about having children.',
    supported ? 'good' : 'neutral', 'D1 fifth-house promise and D7 first-lord foundation', CHILDREN, '6–7, 109',
    `D1 fifth influences ${natalInfluences.join('/') || 'none (unoccupied/unaspected house exception)'}; natal promise ${natalSupported}; D7 first lord ${self}: ${vargaStatus(ctx, self, 'D7')}, H${vargaHouseOf(ctx, self, 'D7')}; support ${condition.support.join('/')}; pressure ${condition.pressure.join('/')}`);
    const guidance = planetCondition(ctx, 'Jupiter', 'D7');
    add(guidance.support.length > 0 && !guidance.pressure.length && natalSupported, 'parenting-guidance', 'Family bonds', guidance.support.length && !guidance.pressure.length
      ? 'Supportive parent-child bonds and a nurturing role in family life are indicated.'
      : 'The family-bond checks are mixed. Warmth, clear expectations and outside support can help; a chart cannot determine a child\'s character or future.',
    guidance.support.length && !guidance.pressure.length ? 'good' : 'neutral',
    'Jupiter in D7 as a parenting guidance factor', CHILDREN, '110',
    `Jupiter D7 associations: support ${guidance.support.join('/') || 'none'}; pressure ${guidance.pressure.join('/') || 'none'}`);
  } else if (domain === 'property') {
    const fourth = vargaLord(ctx, 'D4', 4);
    const movable = [1, 4, 7, 10];
    const homeSign = ((vargaSign(ctx, 'Ascendant', 'D4') + 2) % 12) + 1;
    const mobile = movable.includes(homeSign) && movable.includes(vargaSign(ctx, fourth, 'D4'));
    add(mobile || [2, 5, 8, 11].includes(homeSign), 'property-residence', 'Residence and settlement', mobile
      ? 'Changes of residence or difficulty settling permanently in one place are indicated.'
      : [2, 5, 8, 11].includes(homeSign)
        ? 'A comparatively settled home base and longer-term residence are indicated.'
        : 'The residence checks do not give a clear settled-versus-mobile pattern. Let your work, family needs and finances guide the decision.',
    'neutral', 'D4 fourth-house and fourth-lord movable/fixed signs', COMPREHENSIVE, '103',
    `D4 fourth sign ${homeSign}; fourth lord ${fourth} sign ${vargaSign(ctx, fourth, 'D4')}`);
    const assets = strong(ctx, 'Mars', 'D4') && vargaHouseOf(ctx, 'Mars', 'D4') === 10;
    add(assets, 'property-assets', 'Property ownership', assets
      ? 'Acquiring land or built property is a supported theme in your chart.'
      : 'The strongest fixed-asset pattern checked here is not present. Property ownership is not ruled out; prioritise affordability and sound documentation.',
    assets ? 'good' : 'neutral', 'Strong Mars in the D4 tenth house', COMPREHENSIVE, '102',
    `Mars D4 ${vargaStatus(ctx, 'Mars', 'D4')}, H${vargaHouseOf(ctx, 'Mars', 'D4')}`);
  } else if (domain === 'spiritual') {
    const guidance = houseCondition(ctx, 9, 'D20');
    add(guidance.support.length > 0 && !guidance.pressure.length, 'spiritual-guidance', 'Spiritual learning', guidance.support.length && !guidance.pressure.length
      ? 'Learning through a teacher, pilgrimage or a spiritual community is a supported path for your development.'
      : 'Your learning and guidance checks are mixed. Choose teachers carefully and prefer a simple, sustainable practice over dramatic promises.',
    guidance.support.length && !guidance.pressure.length ? 'good' : 'neutral',
    'D20 ninth-house benefic connections', COMPREHENSIVE, '221',
    `D20 H9 support ${guidance.support.join('/') || 'none'}; pressure ${guidance.pressure.join('/') || 'none'}`);
    const devotion = [5, 8, 12].some((house) => related(ctx, 'Jupiter', house, 'D20') || related(ctx, 'Ketu', house, 'D20'));
    add(devotion, 'spiritual-practice', 'Spiritual practice', devotion
      ? 'Reflective practice and inward spiritual exploration are prominent themes.'
      : 'The specific reflective-practice pattern is not confirmed. You can still build a meaningful routine through consistency, kindness and learning.',
    devotion ? 'good' : 'neutral', 'Jupiter/Ketu connections to D20 fifth, eighth or twelfth', COMPREHENSIVE, '221',
    `Jupiter/Ketu connection to D20 H5/H8/H12 ${devotion}`);
  }
  return findings;
}

export function bookTiming(ctx: Context, answer: Answer): BookTiming[] {
  if (answer.focus === 'nature' || answer.domain === 'health') return [];
  const domain = answer.domain;
  const until = `${Math.min(Number(ctx.today.slice(0, 4)) + 10, 2100)}${ctx.today.slice(4)}`;
  const periods: BookTiming[] = [];
  const record = (start: string, end: string, system: BookTiming['system'], evidence: string, caution = false) => {
    const clippedStart = start.slice(0, 10) > ctx.today ? start.slice(0, 10) : ctx.today;
    const clippedEnd = end.slice(0, 10) < until ? end.slice(0, 10) : until;
    if (clippedStart >= clippedEnd) return;
    periods.push({
      start: clippedStart, end: clippedEnd, system, evidence,
      tone: caution ? 'caution' : 'good',
      text: domain === 'children'
        ? 'A traditional family-planning period, not a prediction of conception or birth. Base pregnancy decisions on medical advice.'
        : caution
          ? 'Relevant opportunities may come with extra adjustment. Prepare before making a major commitment.'
          : domain === 'career'
            ? 'A period to pursue work opportunities and show your value. It does not guarantee a job, promotion or pay rise.'
            : domain === 'property'
              ? 'A period to review housing options and prepare finances. It does not guarantee a purchase or a profitable investment.'
              : domain === 'spiritual'
                ? 'A period to make time for learning and regular practice. Meaningful progress does not depend on a predicted date.'
                : 'A period to be open to commitment and take practical steps. It is not a promised wedding date.',
    });
  };
  if (['marriage', 'relationship', 'career', 'children'].includes(domain)) {
    const income = /\b(income|salary|earnings|pay|money)\b/i.test(answer.question);
    const promotion = /\b(promotion|recognition|leadership)\b/i.test(answer.question);
    const change = /\b(change|switch|resign|new job|transfer)\b/i.test(answer.question);
    const marriageQualified = (name: string) => related(ctx, name, 7, 'D1')
      && [1, 2, 7, 10].some((house) => related(ctx, name, house, 'D9'));
    const careerQualified = (name: string) => (income ? [2, 11] : [2, 10, 11]).some((house) => related(ctx, name, house, 'D1'))
      && (income ? [2, 11] : [1, 2, 10, 11]).some((house) => related(ctx, name, house, 'D10'))
      && (!promotion || related(ctx, name, 10, 'D10') || name === vargaLord(ctx, 'D10', 1) || vargaStatus(ctx, name, 'D10') === 'Exalted');
    const childLinks = (name: string, division: string) =>
      Number(related(ctx, name, 5, division)) + Number(linked(ctx, name, 'Jupiter', division));
    const childQualified = (name: string) => childLinks(name, 'D1') > 0
      && childLinks(name, 'D9') >= childLinks(name, 'D1');
    for (const md of ctx.chart.dashas) {
      for (const ad of md.antardashas) {
        if (!ctx.chart.planets.some((item) => item.name === md.lord) || !ctx.chart.planets.some((item) => item.name === ad.lord)) continue;
        const qualified = domain === 'career' ? careerQualified(md.lord) && careerQualified(ad.lord)
          : domain === 'children' ? childQualified(md.lord) && childQualified(ad.lord)
            && [1, 2, 5, 10].some((house) => related(ctx, ad.lord, house, 'D7'))
            : marriageQualified(md.lord) && marriageQualified(ad.lord);
        if (!qualified || (domain === 'career' && change && !TRIK.some((house) => related(ctx, ad.lord, house, 'D10')))) continue;
        const division = TOPIC_DIVISION[domain];
        const caution = [md.lord, ad.lord].some((name) => TRIK.includes(vargaHouseOf(ctx, name, division)) && planetCondition(ctx, name, division).pressure.length > 0);
        const start = md.start > ad.start ? md.start : ad.start;
        const end = md.end < ad.end ? md.end : ad.end;
        record(start, end, 'Vimshottari',
          `${md.lord}/${ad.lord}: both lords meet the topic's natal/divisional connections.${domain === 'career'
            ? ` Income-specific ${income}; promotion-specific ${promotion}; transition-specific ${change}.` : ''}`, caution);
      }
    }
    if (domain === 'marriage' || domain === 'relationship') {
      const spouse = ctx.karakas.find((item) => item.code === 'DK')?.planet.name;
      const qualified = (name: string) => {
        const sign = SIGN_NAMES.indexOf(name as typeof SIGN_NAMES[number]) + 1;
        if (sign < 1) return false;
        const seventh = SIGN_LORDS[((sign + 5) % 12)];
        const spouseLinked = spouse && (seventh === spouse || planet(ctx, seventh).signNumber === planet(ctx, spouse).signNumber
          || rashiAspects(planet(ctx, seventh).signNumber, planet(ctx, spouse).signNumber));
        return seventh === lordOfHouse(ctx, 7) || Boolean(spouseLinked);
      };
      for (const md of ctx.chart.charaDashas) {
        for (const ad of md.antardashas) {
          if (qualified(md.lord) && qualified(ad.lord)) {
            record(md.start > ad.start ? md.start : ad.start, md.end < ad.end ? md.end : ad.end,
              'Chara', `${md.lord}/${ad.lord}: seventh lord from each running sign connects to natal seventh lord or DK.`);
          }
        }
      }
    }
  }
  return periods.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end))
    .filter((item, index, list) => list.findIndex((other) => other.start === item.start && other.end === item.end && other.tone === item.tone) === index);
}
