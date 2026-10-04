import type { Ayanamsa } from './types';

// "\uFE0E" forces text presentation so the glyphs are not rendered as colour emoji.
export const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'].map((g) => g + '\uFE0E');

export const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
export const SIGN_LORDS = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
export const WEEKDAY_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
export const SIGN_ABBR = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];

export const BODY_ABBR: Record<string, string> = {
  Ascendant: 'Asc',
  Sun: 'Su',
  Moon: 'Mo',
  Mars: 'Ma',
  Mercury: 'Me',
  Jupiter: 'Ju',
  Venus: 'Ve',
  Saturn: 'Sa',
  Rahu: 'Ra',
  Ketu: 'Ke',
};

export const AYANAMSA_OPTIONS: { value: Ayanamsa; label: string }[] = [
  { value: 'LAHIRI', label: 'Lahiri (Chitrapaksha)' },
  { value: 'RAMAN', label: 'Raman' },
  { value: 'KRISHNAMURTI', label: 'Krishnamurti (KP)' },
  { value: 'TRUE_CHITRA', label: 'True Chitra' },
  { value: 'YUKTESHWAR', label: 'Yukteshwar' },
];

export const AYANAMSA_LABEL: Record<Ayanamsa, string> = {
  LAHIRI: 'Lahiri',
  RAMAN: 'Raman',
  KRISHNAMURTI: 'Krishnamurti',
  TRUE_CHITRA: 'True Chitra',
  YUKTESHWAR: 'Yukteshwar',
};
