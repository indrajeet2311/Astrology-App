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

function relevantRules(answer: Answer): string[] | null {
  const q = answer.question.toLowerCase();
  if (answer.domain === 'career') {
    if (/\b(income|salary|earnings|pay|money)\b/.test(q)) return ['career-earnings', 'career-growth'];
    if (/\b(partnership|business partner)\b/.test(q)) return ['career-partnership'];
    if (/\b(business|startup|entrepreneur|self.employ|employment)\b/.test(q)) return ['career-independence', 'career-partnership', 'career-style'];
    if (/\b(field|suits?|profession|what kind|what type)\b/.test(q)) return ['career-fields', 'career-style'];
    if (/\b(change|switch|resign|new job|layoff|fall|transfer)\b/.test(q)) return ['career-setbacks', 'career-foundation', 'career-style'];
    if (/\b(promotion|recognition|leadership|advancement)\b/.test(q)) return ['career-growth', 'career-foundation'];
    return ['career-foundation', 'career-growth', 'career-setbacks', 'career-earnings', 'career-style'];
  }
  if (answer.domain === 'marriage' || answer.domain === 'relationship') {
    if (/\b(spouse|husband|wife|partner qualities|companionship|caring)\b/.test(q)) return ['marriage-care', 'marriage-quality'];
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
  if (answer.domain === 'health') {
    limitation = 'A birth chart cannot diagnose illness or establish recovery dates. Symptoms and medical decisions need a qualified clinician.';
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
  const summaryFindings = answer.focus === 'timing' ? [] : findings.slice(0, 2);
  const summaryFindingIds = summaryFindings.map((finding) => finding.id);
  let summary = limitation || (summaryFindings.length
    ? summaryFindings.map((finding) => finding.text).join(' ')
    : `No implemented source rule matched strongly enough to answer this question about ${theme}. This is inconclusive, not a negative prediction.`);
  if (!limitation && answer.focus === 'timing') {
    summary = timing.length
      ? `The earliest matched period for ${theme} is ${formatRange(timing[0].start, timing[0].end)}.${timing[0].tone === 'caution' ? ' It also carries indications of extra adjustment.' : ''} This is a broad period, not an exact event date.`
      : `No period met the implemented source timing conditions for ${theme} in the next ten years. Timing is inconclusive.`;
  }
  const cards = findings.filter((finding) => !summaryFindingIds.includes(finding.id))
    .map(({ id, title, text, tone }) => ({ id, title, text, tone }));
  const timingNote = ['marriage', 'relationship', 'career', 'children'].includes(answer.domain)
    ? 'An additional timing method described in the books is not calculated here. Exact event dates are not confirmed.'
    : 'Source-qualified dates for this topic are not implemented.';
  if (timing.length) {
    sources.push({
      findingId: 'topic-timing',
      rule: 'Topic-specific natal/divisional main/sub-period connections',
      book: answer.domain === 'career' ? 'V. P. Goel, Predict with Dashamsha'
        : answer.domain === 'children' ? 'V. P. Goel, Predict with Saptamsha' : 'V. P. Goel, Predict with Navamsha',
      pdfPages: answer.domain === 'career' ? '179; Comprehensive 170–171' : answer.domain === 'children' ? '203–205' : '81, 87–90',
      evidence: timing.map((item) => `${item.system} ${item.start}–${item.end}: ${item.evidence}`).join('; '),
      charts: answer.domain === 'career' ? ['D1', 'D10'] : answer.domain === 'children' ? ['D1', 'D9', 'D7'] : ['D1', 'D9'],
    });
  }
  return { summary, summaryFindingIds, cards, details: findings.map((finding) => finding.text),
    advice: [DISCLAIMER], sources, timing, timingNote, limitation };
}
