package com.celestia.astro.model;

import java.util.List;
import java.util.Map;

public record ChartResponse(BirthDetails birthDetails, Position ascendant, List<Position> planets,
                            List<Dasha> dashas, List<Aspect> aspects, List<Yoga> yogas, Transits transits,
                            Panchang panchang) {
  public record BirthDetails(String name, String date, String localTime, String utcOffset, String utcTime,
                             String placeName, double latitude, double longitude, String timeZone,
                             Ayanamsa ayanamsa, double ayanamsaDegrees) {}

  /** {@code dignity} is EXALTED, DEBILITATED, OWN or null; Vargottama means the same sign in D1 and D9. */
  public record Position(String name, double longitude, String sign, int signNumber, int house,
                         double degreeInSign, String nakshatra, int pada, boolean retrograde,
                         int navamsaSignNumber, String dignity, boolean combust, boolean vargottama,
                         Map<String, Integer> divisionalSigns) {}

  /** Houses (1-12) a planet aspects, and the planets standing in them. */
  public record Aspect(String planet, List<Integer> houses, List<String> planets) {}

  public record Yoga(String name, String description, List<String> planets) {}

  /** {@code tithiNumber} runs 1-30 across the lunar month; {@code paksha} is Shukla (waxing) or Krishna (waning). */
  public record Panchang(int tithiNumber, String tithi, String paksha, String vara, String varaLord, String yoga,
                         String karana) {}

  /** Planets at {@code asOf} (UTC ISO instant); houses are counted from the natal Ascendant. */
  public record Transits(String asOf, List<Position> planets, SadeSati sadeSati) {}

  /** {@code phase} is Rising, Peak or Setting when active, otherwise null. */
  public record SadeSati(boolean active, String phase, String description) {}

  /** Vimshottari mahadasha with ISO start/end dates (end exclusive) and its antardashas. */
  public record Dasha(String lord, String start, String end, List<SubPeriod> antardashas) {}

  public record SubPeriod(String lord, String start, String end) {}
}
