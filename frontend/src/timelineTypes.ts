export interface SaturnPeriod {
  kind: 'Sade Sati' | 'Dhaiya';
  phase: string;
  sign: string;
  start: string;
  end: string;
  current: boolean;
}

export interface SaturnCycles {
  moonSign: string;
  currentSaturnSign: string;
  periods: SaturnPeriod[];
}

export type CalendarEventType = 'INGRESS' | 'RETROGRADE' | 'DIRECT' | 'SOLAR_ECLIPSE' | 'LUNAR_ECLIPSE';

export interface CalendarEvent {
  at: string;
  type: CalendarEventType;
  planet: string;
  title: string;
  sign: string;
  house: number;
  moonHouse: number;
  detail: string;
}

export interface Placement {
  name: string;
  sign: string;
  signNumber: number;
  house: number;
  moonHouse: number;
  retrograde: boolean;
}

export interface MonthSnapshot {
  date: string;
  planets: Placement[];
}

export interface TransitCalendar {
  from: string;
  to: string;
  natalAscendantSign: string;
  natalMoonSign: string;
  events: CalendarEvent[];
  months: MonthSnapshot[];
}

export type FestivalCategory = 'EKADASHI' | 'FESTIVAL' | 'PURNIMA' | 'AMAVASYA' | 'PRADOSH' | 'SANKRANTI' | 'SANKASHTI';

export interface FestivalEvent {
  date: string;
  category: FestivalCategory;
  name: string;
  detail: string;
}

export interface LunarMonth {
  name: string;
  adhika: boolean;
  start: string;
  end: string;
}

export interface FestivalCalendar {
  year: number;
  placeName: string | null;
  months: LunarMonth[];
  events: FestivalEvent[];
}
