import { DOMAIN_BUILDERS, synthesizeAnswer, focusAnswer } from './answers';
import type { Answer, DomainId, Focus } from './answers';
import type { Context } from './core';

const KEYWORDS: Record<DomainId, string[]> = {
  marriage: ['marry', 'marri', 'wedding', 'shaadi', 'shadi', 'spouse', 'husband', 'wife', 'engage', 'bride', 'groom', 'divorce', 'life partner', 'settle down'],
  relationship: ['love', 'relationship', 'partner', 'dating', 'girlfriend', 'boyfriend', 'romanc', 'breakup', 'break up', 'crush', 'affair', 'soulmate', 'compatib'],
  career: ['career', 'job', 'profession', 'work', 'working', 'promotion', 'business', 'salary', 'boss', 'office', 'employ', 'resign', 'layoff', 'fired', 'income', 'startup', 'entrepreneur'],
  property: ['property', 'house', 'home', 'flat', 'apartment', 'land', 'plot', 'real estate', 'vehicle', 'car', 'construct', 'mortgage', 'buy a', 'bungalow'],
  spiritual: ['spiritual', 'moksha', 'meditat', 'guru', 'dharma', 'god', 'enlighten', 'yoga', 'mantra', 'soul', 'purpose', 'faith', 'religio'],
  health: ['health', 'illness', 'disease', 'sick', 'surgery', 'accident', 'recover', 'hospital', 'pain', 'cancer', 'diabet', 'fitness', 'longevity', 'injur', 'wellness'],
};

export interface Classified {
  domain: DomainId | null;
  focus: Focus;
}

export function classify(question: string): Classified {
  const q = question.toLowerCase();
  let best: DomainId | null = null;
  let bestScore = 0;
  for (const [domain, words] of Object.entries(KEYWORDS) as [DomainId, string[]][]) {
    // Short words must match whole words ("car" must not match "careful"); longer ones match as stems.
    const score = words.filter((w) => new RegExp(w.length <= 4 ? `\\b${w}s?\\b` : `\\b${w}`).test(q)).length;
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  const focus: Focus = /\b(when|timing|which year|what year|how soon|how long|by when|at what age|which age|period|window|dasha)\b/.test(q) ? 'timing'
    : /\b(field|suits?|qualities|practices?|meditation|mantra|what kind|what type|nature|style)\b/.test(q) ? 'nature'
    : /\b(rise|fall|decline|growth|grow|promotion|loss|lose|layoff|downfall|ups and downs|peak|stable|stability)\b/.test(q) ? 'riseFall'
      : /\b(how|what kind|what type|nature|like|describe|style|spouse be|partner be)\b/.test(q) ? 'nature'
        : 'general';
  return { domain: best, focus };
}

export const SUGGESTED_QUESTIONS: { label: string; question: string; domain: DomainId }[] = [
  { label: 'When will I get married?', question: 'When will I get married?', domain: 'marriage' },
  { label: 'How will my marriage and spouse be?', question: 'How will my marriage and spouse be?', domain: 'marriage' },
  { label: 'Career rise or fall ahead?', question: 'Will my career rise or fall in the coming years?', domain: 'career' },
  { label: 'Which field suits my career?', question: 'What kind of career suits me?', domain: 'career' },
  { label: 'When can I buy property?', question: 'When can I buy a house or property?', domain: 'property' },
  { label: 'When will love or a relationship come?', question: 'When will a relationship come into my life?', domain: 'relationship' },
  { label: 'What is my spiritual path?', question: 'What is my spiritual path and when will it deepen?', domain: 'spiritual' },
  { label: 'How is my health outlook?', question: 'How is my health outlook and when should I be careful?', domain: 'health' },
  { label: 'When could my career or income improve?', question: 'When could my career and income improve?', domain: 'career' },
  { label: 'What partner qualities suit me?', question: 'What kind of partner qualities are shown in my chart?', domain: 'relationship' },
  { label: 'What should I know about buying a home?', question: 'What should I know about buying a home or property?', domain: 'property' },
  { label: 'When may a job change be favorable?', question: 'When may a job change or promotion be favorable?', domain: 'career' },
  { label: 'What supports my spiritual growth?', question: 'What practices may support my spiritual growth?', domain: 'spiritual' },
];

export function answerQuestion(ctx: Context, question: string, forced?: DomainId): Answer | null {
  const { domain, focus } = classify(question);
  const chosen = forced ?? domain;
  return chosen ? focusAnswer(ctx, synthesizeAnswer(ctx, DOMAIN_BUILDERS[chosen](ctx, question, focus))) : null;
}
