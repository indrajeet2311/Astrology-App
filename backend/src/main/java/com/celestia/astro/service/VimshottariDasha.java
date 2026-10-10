package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.IntStream;

/** Vimshottari dasha timeline derived from the Moon's sidereal longitude. */
public final class VimshottariDasha {
  private static final String[] LORDS = {
      "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"};
  private static final double[] YEARS = {7, 20, 6, 10, 7, 18, 16, 19, 17};
  private static final double NAKSHATRA_SPAN = 360.0 / 27.0;

  private VimshottariDasha() {}

  /** Nine mahadashas, the first beginning at the (possibly pre-birth) start of the Moon's nakshatra period. */
  public static List<Dasha> compute(double moonLongitude, Instant birth, ZoneId zone) {
    double lon = AstroMath.norm(moonLongitude);
    int nakshatra = AstroMath.nakshatraIndex(lon);
    double elapsedFraction = (lon - nakshatra * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
    int first = nakshatra % 9;

    int[] sequence = IntStream.range(0, 9).map(i -> (first + i) % 9).toArray();
    return DashaTimelineBuilder.build(LORDS, YEARS, sequence, elapsedFraction, birth, zone);
  }
}
