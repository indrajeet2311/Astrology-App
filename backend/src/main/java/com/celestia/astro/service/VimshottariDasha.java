package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;
import com.celestia.astro.model.ChartResponse.SubPeriod;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/** Vimshottari dasha timeline derived from the Moon's sidereal longitude. */
public final class VimshottariDasha {
  private static final String[] LORDS = {
      "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"};
  private static final int[] YEARS = {7, 20, 6, 10, 7, 18, 16, 19, 17};
  private static final int CYCLE_YEARS = 120;
  private static final double SECONDS_PER_YEAR = 365.25 * 86_400.0;
  private static final double NAKSHATRA_SPAN = 360.0 / 27.0;

  private VimshottariDasha() {}

  /** Nine mahadashas, the first beginning at the (possibly pre-birth) start of the Moon's nakshatra period. */
  public static List<Dasha> compute(double moonLongitude, Instant birth, ZoneId zone) {
    double lon = AstroMath.norm(moonLongitude);
    int nakshatra = AstroMath.nakshatraIndex(lon);
    double elapsedFraction = (lon - nakshatra * NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
    int first = nakshatra % 9;

    double start = birth.getEpochSecond() - elapsedFraction * YEARS[first] * SECONDS_PER_YEAR;
    List<Dasha> result = new ArrayList<>();
    for (int i = 0; i < 9; i++) {
      int lord = (first + i) % 9;
      double length = YEARS[lord] * SECONDS_PER_YEAR;
      double end = start + length;
      result.add(new Dasha(LORDS[lord], date(start, zone), date(end, zone), antardashas(lord, start, length, zone)));
      start = end;
    }
    return result;
  }

  private static List<SubPeriod> antardashas(int mahaLord, double start, double length, ZoneId zone) {
    List<SubPeriod> subs = new ArrayList<>();
    double cursor = start;
    for (int i = 0; i < 9; i++) {
      int sub = (mahaLord + i) % 9;
      double end = i == 8 ? start + length : cursor + length * YEARS[sub] / CYCLE_YEARS;
      subs.add(new SubPeriod(LORDS[sub], date(cursor, zone), date(end, zone)));
      cursor = end;
    }
    return subs;
  }

  private static String date(double epochSeconds, ZoneId zone) {
    return Instant.ofEpochSecond((long) Math.floor(epochSeconds)).atZone(zone).toLocalDate().toString();
  }
}
