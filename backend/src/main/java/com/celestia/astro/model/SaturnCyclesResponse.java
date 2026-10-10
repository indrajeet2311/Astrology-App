package com.celestia.astro.model;

import java.util.List;

public record SaturnCyclesResponse(String moonSign, String currentSaturnSign, List<Period> periods) {
  /** kind is "Sade Sati" or "Dhaiya"; phase is Rising, Peak, Setting, Kantaka (4th) or Ashtama (8th). */
  public record Period(String kind, String phase, String sign, String start, String end, boolean current) {}
}
