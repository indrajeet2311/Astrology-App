export type Ayanamsa = 'LAHIRI' | 'RAMAN' | 'KRISHNAMURTI' | 'TRUE_CHITRA' | 'YUKTESHWAR';
export type HouseSystem = 'WHOLE_SIGN' | 'EQUAL';

export interface Position {
  name: string;
  longitude: number;
  sign: string;
  signNumber: number;
  house: number;
  degreeInSign: number;
  nakshatra: string;
  pada: number;
  retrograde: boolean;
  navamsaSignNumber: number;
  dignity: 'EXALTED' | 'DEBILITATED' | 'OWN' | null;
  combust: boolean;
  vargottama: boolean;
  divisionalSigns: Record<string, number>;
}

export interface BirthDetails {
  name: string | null;
  date: string;
  localTime: string;
  utcOffset: string;
  utcTime: string;
  placeName: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  ayanamsa: Ayanamsa;
  ayanamsaDegrees: number;
  trueNode: boolean;
  houseSystem: HouseSystem;
  laterOffset: boolean;
}

export interface SubPeriod {
  lord: string;
  start: string;
  end: string;
  pratyantardashas: SubPeriod[];
}

export interface Dasha extends SubPeriod {
  antardashas: SubPeriod[];
}

export interface Aspect {
  planet: string;
  houses: number[];
  planets: string[];
}

export interface Yoga {
  name: string;
  description: string;
  planets: string[];
}

export interface KootaScore {
  name: string;
  score: number;
  maxScore: number;
  detail: string;
}

export interface Manglik {
  present: boolean;
  level: 'None' | 'Low' | 'Medium' | 'High' | 'Cancelled';
  factors: string[];
  cancellations: string[];
}

export interface CompatibilityRule {
  name: string;
  matched: boolean;
  points: number;
  maxPoints: number;
  reason: string;
  evidence: string[];
}

export interface CompatibilityLayer {
  name: string;
  points: number;
  maxPoints: number;
  rules: CompatibilityRule[];
}

export interface HouseConnection {
  house: number;
  groom: number[];
  bride: number[];
  overlap: number[];
  matched: boolean;
}

export interface CompatibilityReport {
  otherVedic: CompatibilityLayer;
  chanceOfMarriage: CompatibilityLayer;
  directSynastry: CompatibilityRule[];
  marriageSynastry: CompatibilityRule[];
  connectionSets: HouseConnection[];
  notes: string[];
}

export interface KundliMatch {
  score: number;
  maxScore: number;
  brideMoonSign: string;
  groomMoonSign: string;
  kootas: KootaScore[];
  notes: string[];
  manglik?: { bride: Manglik; groom: Manglik; balanced: boolean; verdict: string } | null;
  remedies?: string[];
  summary?: string | null;
  compatibility?: CompatibilityReport | null;
}

export interface SadeSati {
  active: boolean;
  phase: 'Rising' | 'Peak' | 'Setting' | null;
  description: string;
}

export interface Transits {
  asOf: string;
  planets: Position[];
  sadeSati: SadeSati;
}

export interface Panchang {
  tithiNumber: number;
  tithi: string;
  paksha: 'Shukla' | 'Krishna';
  vara: string;
  varaLord: string;
  yoga: string;
  karana: string;
}

export interface DailyPanchang {
  asOf: string;
  panchang: Panchang;
  moon: Position;
}

export interface PanchangRequest {
  date: string;
  placeName: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  ayanamsa: Ayanamsa;
}

export interface Chart {
  birthDetails: BirthDetails;
  ascendant: Position;
  planets: Position[];
  dashas: Dasha[];
  yoginiDashas: Dasha[];
  charaDashas: Dasha[];
  aspects: Aspect[];
  yogas: Yoga[];
  transits: Transits;
  panchang: Panchang;
}

export interface AnnualChartsResponse {
  year: number;
  varshaphalAt: string;
  varshaphal: Chart;
  tithiPraveshAt: string;
  tithiPravesh: Chart;
}

export interface Place {
  placeName: string;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface BirthPayload {
  name: string;
  date: string;
  time: string;
  placeName: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  ayanamsa: Ayanamsa;
  trueNode?: boolean;
  houseSystem?: HouseSystem;
  transitDate?: string;
  laterOffset?: boolean;
}
