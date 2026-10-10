export interface SlowSegment {
  signNumber: number;
  nakshatraIndex?: number;
  start: string;
  end: string;
}

export interface SlowTrack {
  name: string;
  segments: SlowSegment[];
}

export interface SlowTransits {
  from: string;
  to: string;
  tracks: SlowTrack[];
}
