package com.celestia.astro.service;

import com.celestia.astro.model.HouseSystem;

/** Pure zodiac arithmetic on sidereal ecliptic longitudes in degrees. */
public final class AstroMath {
  private static final String[] SIGNS = {
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"};

  private static final String[] NAKSHATRAS = {
      "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
      "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha",
      "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
      "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"};

  private static final double NAKSHATRA_SPAN = 360.0 / 27.0;
  private static final double PADA_SPAN = NAKSHATRA_SPAN / 4.0;

  private AstroMath() {}

  /** Normalises to the half-open range [0, 360). */
  public static double norm(double degrees) {
    double r = degrees % 360.0;
    if (r < 0) r += 360.0;
    // A tiny negative input rounds up to exactly 360.0, which would index past the last sign.
    return r >= 360.0 ? 0.0 : r;
  }

  /** Zero-based sign index: 0 = Aries ... 11 = Pisces. */
  public static int sign(double longitude) {
    return Math.min(11, (int) (norm(longitude) / 30.0));
  }

  /** Whole-sign house (1-12) of a longitude relative to the Ascendant. */
  public static int house(double longitude, double ascendant) {
    return 1 + Math.floorMod(sign(longitude) - sign(ascendant), 12);
  }

  public static int house(double longitude, double ascendant, HouseSystem system) {
    if (system == HouseSystem.EQUAL) {
      return Math.min(12, (int) (norm(longitude - ascendant) / 30.0) + 1);
    }
    return house(longitude, ascendant);
  }

  /** Zero-based D9 (Navamsa) sign; each 3°20' slice advances one sign, starting from Aries across the zodiac. */
  public static int navamsaSign(double longitude) {
    return divisionalSign(longitude, 9);
  }

  /** Zero-based sign index for a classical Shodashvarga division. */
  public static int divisionalSign(double longitude, int division) {
    double lon = norm(longitude);
    int sign = sign(lon);
    double withinSign = lon - sign * 30.0;
    int part;
    int start;
    switch (division) {
      case 1 -> { return sign; }
      case 2 -> {
        part = Math.min(1, (int) (withinSign / 15.0));
        return sign % 2 == 0 ? (part == 0 ? 4 : 3) : (part == 0 ? 3 : 4);
      }
      case 3 -> { part = segment(withinSign, 3) * 4; start = sign; }
      case 4 -> { part = segment(withinSign, 4) * 3; start = sign; }
      case 7 -> {
        part = segment(withinSign, 7);
        start = sign + (sign % 2 == 0 ? 0 : 6);
      }
      case 9 -> {
        part = segment(withinSign, 9);
        start = switch (sign % 3) { case 0 -> sign; case 1 -> sign + 8; default -> sign + 4; };
      }
      case 10 -> {
        part = segment(withinSign, 10);
        start = sign + (sign % 2 == 0 ? 0 : 8);
      }
      case 12 -> { part = segment(withinSign, 12); start = sign; }
      case 16 -> {
        part = segment(withinSign, 16);
        start = switch (sign % 3) { case 0 -> 0; case 1 -> 4; default -> 8; };
      }
      case 20 -> {
        part = segment(withinSign, 20);
        start = switch (sign % 3) { case 0 -> 0; case 1 -> 8; default -> 4; };
      }
      case 24 -> {
        part = segment(withinSign, 24);
        start = sign % 2 == 0 ? 4 : 3;
      }
      case 27 -> {
        part = segment(withinSign, 27);
        start = switch (sign % 4) { case 0 -> 0; case 1 -> 3; case 2 -> 6; default -> 9; };
      }
      case 30 -> { return trimsamsaSign(sign, withinSign); }
      case 40 -> {
        part = segment(withinSign, 40);
        start = sign % 2 == 0 ? 0 : 6;
      }
      case 45 -> {
        part = segment(withinSign, 45);
        start = switch (sign % 3) { case 0 -> 0; case 1 -> 4; default -> 8; };
      }
      case 60 -> { part = segment(withinSign, 60); start = sign; }
      default -> throw new IllegalArgumentException("Unsupported divisional chart D" + division + ".");
    }
    return Math.floorMod(start + part, 12);
  }

  private static int segment(double withinSign, int division) {
    return Math.min(division - 1, (int) (withinSign * division / 30.0));
  }

  private static int trimsamsaSign(int sign, double degree) {
    boolean odd = sign % 2 == 0;
    double[] limits = odd ? new double[] {5, 10, 18, 25, 30} : new double[] {5, 12, 20, 25, 30};
    int[] rulers = odd ? new int[] {0, 10, 8, 2, 6} : new int[] {1, 5, 11, 9, 7};
    for (int i = 0; i < limits.length; i++) if (degree < limits[i]) return rulers[i];
    return rulers[rulers.length - 1];
  }

  public static String signName(int index) {
    return SIGNS[index];
  }

  /** Zero-based nakshatra index: 0 = Ashwini ... 26 = Revati. */
  public static int nakshatraIndex(double longitude) {
    return Math.min(26, (int) (norm(longitude) / NAKSHATRA_SPAN));
  }

  public static String nakshatra(double longitude) {
    return NAKSHATRAS[nakshatraIndex(longitude)];
  }

  /** Nakshatra pada (1-4). */
  public static int pada(double longitude) {
    double withinNakshatra = norm(longitude) - nakshatraIndex(longitude) * NAKSHATRA_SPAN;
    return Math.max(1, Math.min(4, (int) (withinNakshatra / PADA_SPAN) + 1));
  }
}
