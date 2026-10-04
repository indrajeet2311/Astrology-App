package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;
import com.celestia.astro.model.ChartResponse.Position;

import java.time.Instant;
import java.time.ZoneId;
import java.util.stream.IntStream;

/**
 * Chara Dasha after K.N. Rao: the sequence runs zodiacally when the 9th sign from the ascendant is odd,
 * otherwise in reverse. Each sign lasts the count to its lord (forward for Ar, Ta, Ge, Li, Sc, Sg, backward
 * for the rest, 12 if the lord is in the sign). Scorpio/Aquarius use whichever co-lord has more conjunctions.
 */
public final class CharaDasha {
  private static final String[] SIGNS = {
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio",
      "Sagittarius", "Capricorn", "Aquarius", "Pisces"};

  private CharaDasha() {}

  public static java.util.List<Dasha> compute(int ascendantSignNumber, java.util.List<Position> planets,
                                               Instant birth, ZoneId zone) {
    int start = ascendantSignNumber - 1;
    int sequenceDirection = (start + 8) % 12 % 2 == 0 ? 1 : -1;
    int[] sequence = IntStream.range(0, SIGNS.length)
        .map(i -> Math.floorMod(start + sequenceDirection * i, SIGNS.length)).toArray();
    double[] years = new double[SIGNS.length];
    for (int sign : sequence) years[sign] = durationYears(sign, planets);
    return DashaTimelineBuilder.build(SIGNS, years, sequence, 0, birth, zone,
      SIDEREAL_YEAR_SECONDS, true);
  }

  private static final double SIDEREAL_YEAR_SECONDS = 365.256363 * 86_400.0;

  private static int durationYears(int sign, java.util.List<Position> planets) {
    int countDirection = switch (sign) {
      case 0, 1, 2, 6, 7, 8 -> 1;
      default -> -1;
    };
    int rulerSign = lordOf(sign, planets).signNumber() - 1;
    int distance = Math.floorMod((rulerSign - sign) * countDirection, 12);
    return distance == 0 ? 12 : distance;
  }

  private static Position lordOf(int sign, java.util.List<Position> planets) {
    return switch (sign) {
      case 0 -> find(planets, "Mars");
      case 7 -> stronger(sign, planets, find(planets, "Mars"), find(planets, "Ketu"));
      case 1, 6 -> find(planets, "Venus");
      case 2, 5 -> find(planets, "Mercury");
      case 3 -> find(planets, "Moon");
      case 4 -> find(planets, "Sun");
      case 8, 11 -> find(planets, "Jupiter");
      case 9 -> find(planets, "Saturn");
      case 10 -> stronger(sign, planets, find(planets, "Saturn"), find(planets, "Rahu"));
      default -> throw new IllegalArgumentException("Invalid sign index.");
    };
  }

  /** A co-lord sitting in the sign yields to the other; then more conjunctions wins, then higher degree. */
  private static Position stronger(int sign, java.util.List<Position> planets, Position a, Position b) {
    boolean aHome = a.signNumber() - 1 == sign;
    boolean bHome = b.signNumber() - 1 == sign;
    if (aHome != bHome) return aHome ? b : a;
    long aCount = planets.stream().filter(p -> p != a && p.signNumber() == a.signNumber()).count();
    long bCount = planets.stream().filter(p -> p != b && p.signNumber() == b.signNumber()).count();
    if (aCount != bCount) return aCount > bCount ? a : b;
    return a.degreeInSign() >= b.degreeInSign() ? a : b;
  }

  private static Position find(java.util.List<Position> planets, String name) {
    return planets.stream().filter(p -> p.name().equals(name)).findFirst().orElseThrow();
  }
}