package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;

import java.time.Instant;
import java.time.ZoneId;
import java.util.stream.IntStream;

/** 36-year Yogini cycle derived from the birth Moon's nakshatra. */
public final class YoginiDasha {
  private static final String[] YOGINIS = {
      "Mangala", "Pingala", "Dhanya", "Bhramari", "Bhadrika", "Ulka", "Siddha", "Sankata"};
  private static final double[] YEARS = {1, 2, 3, 4, 5, 6, 7, 8};
  private static final double NAKSHATRA_SPAN = 360.0 / 27.0;

  private YoginiDasha() {}

  public static java.util.List<Dasha> compute(double moonLongitude, Instant birth, ZoneId zone) {
    double longitude = AstroMath.norm(moonLongitude);
    int nakshatra = AstroMath.nakshatraIndex(longitude);
    double withinNakshatra = longitude - nakshatra * NAKSHATRA_SPAN;
    double elapsed = withinNakshatra / NAKSHATRA_SPAN;
    int first = (nakshatra + 3) % YOGINIS.length;
    int[] sequence = IntStream.range(0, YOGINIS.length).map(i -> (first + i) % YOGINIS.length).toArray();
    return DashaTimelineBuilder.build(YOGINIS, YEARS, sequence, elapsed, birth, zone);
  }
}