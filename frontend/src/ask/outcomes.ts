import { formatRange } from './core';
import type { Context, Tone } from './core';
import type { Answer, DomainId } from './answers';
import { bookTiming, evaluateBookFindings } from './bookRules';
import type { BookTiming } from './bookRules';

export interface ReadingSource {
  findingId: string;
  rule: string;
  book: string;
  pdfPages: string;
  evidence: string;
  charts: string[];
}

export interface OutcomeReading {
  summary: string;
  summaryFindingIds: string[];
  details: string[];
  advice: string[];
  sources: ReadingSource[];
  cards: { id: string; title: string; text: string; tone: Tone }[];
  timing: BookTiming[];
  timingNote: string;
  limitation: string;
}

// Legacy assessment descriptions still use this mapping; source-qualified Ask does not.
export const PLANET_FIELDS: Record<string, string> = {
  Sun: 'government, administration, leadership or medicine', Moon: 'public-facing, caring, hospitality or food fields',
  Mars: 'engineering, defence, sports, surgery or real estate', Mercury: 'communication, commerce, technology or analysis',
  Jupiter: 'teaching, law, advisory, finance or counselling', Venus: 'arts, design, luxury, media or entertainment',
  Saturn: 'operations, industry, construction, research or long-haul service', Rahu: 'technology, foreign dealings or unconventional work',
  Ketu: 'research, healing, technical or spiritual work',
};

const THEMES: Record<DomainId, string> = {
  marriage: 'marriage', relationship: 'relationships', children: 'children and parenting',
  career: 'your career', property: 'home and property', spiritual: 'spiritual development', health: 'health',
};
const DISCLAIMER = 'These are traditional astrology interpretations, not established predictions or guarantees. Accurate birth time matters.';

function transitPhrase(contact: NonNullable<BookTiming['transitContacts']>[number]): string {
  if (contact.aspect === 'transits over' || contact.aspect === 'conjunction') {
    return `${contact.planet} transits over ${contact.target}`;
  }
  return `${contact.planet}’s ${contact.aspect} reaches ${contact.target}`;
}

function relevantRules(answer: Answer): string[] | null {
  const q = answer.question.toLowerCase();
  if (answer.domain === 'career') {
    if (/\b(income|salary|earnings|pay|money)\b/.test(q)) return ['career-earnings', 'career-growth', 'career-dispositors'];
    if (/\b(partnership|business partner)\b/.test(q)) return ['career-partnership'];
    if (/\b(business|startup|entrepreneur|self.employ|employment)\b/.test(q)) return ['career-independence', 'career-partnership', 'career-style', 'career-dispositors'];
    if (/\b(field|suits?|profession|what kind|what type)\b/.test(q)) return ['career-fields', 'career-style', 'career-dispositors'];
    if (/\b(rise|fall)\b/.test(q)) return ['career-growth', 'career-setbacks', 'career-foundation', 'career-dispositors'];
    if (/\b(change|switch|resign|new job|layoff|transfer)\b/.test(q)) return ['career-setbacks', 'career-foundation', 'career-style', 'career-dispositors'];
    if (/\b(promotion|recognition|leadership|advancement)\b/.test(q)) return ['career-growth', 'career-status', 'career-foundation', 'career-dispositors'];
    return ['career-foundation', 'career-growth', 'career-status', 'career-setbacks', 'career-dispositors'];
  }
  if (answer.domain === 'marriage' || answer.domain === 'relationship') {
    if (/\b(partner qualities|companionship|caring)\b/.test(q)) return ['marriage-care', 'marriage-quality'];
    if (/\b(spouse|husband|wife)\b/.test(q)) return ['marriage-readiness', 'marriage-quality', 'marriage-care'];
    if (/\b(quality|married life|how.*marriage|happy|happiness)\b/.test(q)) return ['marriage-quality', 'marriage-after', 'marriage-family'];
    if (/\b(family|communication|arguments)\b/.test(q)) return ['marriage-family', 'marriage-quality'];
    if (/\b(after marriage|prosperity)\b/.test(q)) return ['marriage-after'];
  }
  return null;
}

export function buildOutcomeReading(ctx: Context, answer: Answer): OutcomeReading {
  const q = answer.question.toLowerCase();
  const theme = THEMES[answer.domain];
  let limitation = '';
  if (answer.domain === 'health' && /\b(diagnos\w*|what disease|which disease|cancer|diabet\w*|surgery|recover\w*|cure\w*|life expectancy|how long.*live|will i die)\b/.test(q)) {
    limitation = 'Astrology cannot diagnose a condition, predict recovery or estimate life expectancy. Please use a qualified clinician for symptoms and medical decisions.';
  } else if (answer.domain === 'children' && /\b(how many|number|boy|girl|gender|sex|fertility|conceiv\w*|pregnan\w*|twins)\b/.test(q)) {
    limitation = 'The implemented rules cannot establish fertility, pregnancy, twins, or the number or sex of children. Medical questions need a qualified clinician.';
  } else if (['marriage', 'relationship'].includes(answer.domain)) {
    if (/\b(appearance|look|looks|beautiful|handsome|complexion|height)\b/.test(q)) {
      limitation = 'The implemented rules and available birth details do not establish a future partner’s physical appearance.';
    } else if (/\b(compatibility|compatible|match|matching)\b/.test(q)) {
      limitation = 'A comparison of compatibility needs both people’s birth details. A single-chart reading cannot answer that comparison.';
    }
  }
  const priority = relevantRules(answer);
  const matched = evaluateBookFindings(ctx, answer.domain)
    .filter((finding) => !priority || priority.includes(finding.id))
    .sort((a, b) => priority ? priority.indexOf(a.id) - priority.indexOf(b.id) : 0);
  const findings = limitation ? [] : matched.slice(0, 5);
  const timing = limitation ? [] : bookTiming(ctx, answer);
  const sources: ReadingSource[] = findings.map(({ id, rule, book, pdfPages, evidence, charts }) =>
    ({ findingId: id, rule, book, pdfPages, evidence, charts }));
  const summaryFindings = answer.focus === 'timing' && answer.domain !== 'health' ? [] : findings.slice(0, 2);
  const summaryFindingIds = summaryFindings.map((finding) => finding.id);
  let summary = limitation || (summaryFindings.length
    ? summaryFindings.map((finding) => finding.text).join(' ')
    : `No implemented source rule matched strongly enough to answer this question about ${theme}. This is inconclusive, not a negative prediction.`);
  if (!limitation && answer.focus === 'timing' && answer.domain !== 'health') {
    const primaryPeriod = timing.find((period) => period.system === 'Vimshottari');
    const secondaryPeriod = timing.find((period) => period.system !== 'Vimshottari');
    const transitWindow = primaryPeriod?.transitContacts?.[0];
    summary = primaryPeriod
      ? `Vimshottari, the primary timing method, points first to ${formatRange(primaryPeriod.start, primaryPeriod.end)} for ${theme}.${transitWindow ? ` Transit cross-check: ${transitPhrase(transitWindow)} (${formatRange(transitWindow.start, transitWindow.end)}).` : primaryPeriod.transitCheck === 'not-found' ? ' No Jupiter or Saturn sign-aspect contact with the topic-specific chart factors was found in this period.' : ''}${primaryPeriod.tone === 'caution' ? ' The period also calls for extra care.' : ''} These are broad windows, not exact event dates.`
      : secondaryPeriod
        ? `No primary Vimshottari period met the chart checks for ${theme} in the next ten years. ${secondaryPeriod.system} offers a secondary window around ${formatRange(secondaryPeriod.start, secondaryPeriod.end)}; treat it as a cross-check, not a firm date.`
        : `No period met the source timing checks for ${theme} in the next ten years. Timing remains open; this is not a denial of the outcome.`;
  }
  const cards = findings.filter((finding) => !summaryFindingIds.includes(finding.id))
    .map(({ id, title, text, tone }) => ({ id, title, text, tone }));
  const matchedSystems = [...new Set(timing.map((item) => item.system))];
  const timingNote = ['marriage', 'relationship', 'career', 'children'].includes(answer.domain)
    ? answer.domain === 'marriage' || answer.domain === 'relationship'
      ? `Vimshottari gives the main periods. Jupiter’s 5th, 7th and 9th aspects and Saturn’s 3rd, 7th and 10th aspects are checked by sign against D1 marriage factors and D9 Lagna, seventh-house, Venus and seventh-lord signs, including their dispositors. Jupiter’s aspect to the active dasha lord and the dasha lord’s transit over natal Venus or the seventh lord are also checked. These transits refine a dasha indication; they do not create a marriage promise by themselves. Yogini and Chara are cross-checks${matchedSystems.includes('Yogini') ? '. The listed Yogini period uses the regular cycle; the book’s progressed Yogini method is not calculated here' : ''}${!ctx.transits ? '. Transit data was unavailable, so these dates rely on dasha periods alone' : ''}. The dasha calendar is shared across topics, so one period can activate both marriage and career; their transit contacts and secondary dasha checks can still differ.`
      : answer.domain === 'career'
        ? `Vimshottari is primary, following the Dashamsha timing method. Jupiter and Saturn sign-aspects are checked against D1 career and D10 Lagna, profession, income and gains factors, including the tenth lord’s dispositors; active dasha lords are also checked as they cross the D10 profession factors. These refine, rather than replace, the dasha promise. Yogini and Chara are secondary checks. The book calls for progressed Yogini; this chart provides the regular Yogini cycle, so that check is provisional${!ctx.transits ? '. Transit data was unavailable, so dates rely on dasha periods alone' : ''}. The dasha calendar is shared across topics, so one period can activate both career and marriage; their transit contacts and secondary dasha checks can still differ.`
        : 'Vimshottari periods are primary; Yogini and Chara can provide secondary confirmation. The windows are broad, not exact event dates.'
    : 'Source-qualified dates for this topic are not implemented.';
  if (timing.length) {
    sources.push({
      findingId: 'topic-timing',
      rule: 'Topic-specific natal/divisional main/sub-period connections refined by whole-sign Jupiter/Saturn aspects to natal and divisional topic signs and their dispositors',
      book: answer.domain === 'career' ? 'V. P. Goel, Predict with Dashamsha; Comprehensive Prediction by Divisional Charts'
        : answer.domain === 'children' ? 'V. P. Goel, Predict with Saptamsha' : 'V. P. Goel, Predict with Navamsha; Comprehensive Prediction by Divisional Charts',
      pdfPages: answer.domain === 'career' ? 'Dashamsha 129–130, 174–175, 179, 192–196; Comprehensive 2' : answer.domain === 'children' ? '203–205' : 'Navamsha 82–91, 96–98, 104–107; Comprehensive 2; progressed Yogini 92–96',
      evidence: timing.map((item) => `${item.system} ${item.start}–${item.end}: ${item.evidence}${item.transitContacts?.length ? `; transit contacts ${item.transitContacts.map((contact) => `${transitPhrase(contact)} ${contact.start}–${contact.end}`).join(', ')}` : ''}`).join('; '),
      charts: answer.domain === 'career' ? ['D1', 'D10'] : answer.domain === 'children' ? ['D1', 'D9', 'D7'] : ['D1', 'D9'],
    });
  }
  return { summary, summaryFindingIds, cards, details: findings.map((finding) => finding.text),
    advice: [DISCLAIMER], sources, timing, timingNote, limitation };
}
