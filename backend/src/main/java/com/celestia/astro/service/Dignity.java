package com.celestia.astro.service;

import java.util.Map;

/** Classical planetary dignity (sign strength) and combustion for the seven visible grahas. */
public final class Dignity {
  // Zero-based sign indices: 0 = Aries ... 11 = Pisces.
  private static final Map<String, Integer> EXALTATION = Map.of(
      "Sun", 0, "Moon", 1, "Mars", 9, "Mercury", 5, "Jupiter", 3, "Venus", 11, "Saturn", 6);
  private static final Map<String, int[]> OWN = Map.of(
      "Sun", new int[] {4}, "Moon", new int[] {3}, "Mars", new int[] {0, 7}, "Mercury", new int[] {2, 5},
      "Jupiter", new int[] {8, 11}, "Venus", new int[] {1, 6}, "Saturn", new int[] {9, 10});
  /** Combustion orb in degrees from the Sun: {direct, retrograde}. */
  private static final Map<String, double[]> COMBUST_ORB = Map.of(
      "Moon", new double[] {12, 12}, "Mars", new double[] {17, 17}, "Mercury", new double[] {14, 12},
      "Jupiter", new double[] {11, 11}, "Venus", new double[] {10, 8}, "Saturn", new double[] {15, 15});
  /** Ruler of each sign, indexed by zero-based sign. */
  private static final String[] SIGN_LORD = {
      "Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"};

  private Dignity() {}

  public static String signLord(int signIndex) {
    return SIGN_LORD[signIndex];
  }

  /** EXALTED, DEBILITATED or OWN; null when neutral or for bodies without a classical dignity (Rahu, Ketu). */
  public static String dignity(String body, int signIndex) {
    Integer exalted = EXALTATION.get(body);
    if (exalted == null) return null;
    if (signIndex == exalted) return "EXALTED";
    if (signIndex == (exalted + 6) % 12) return "DEBILITATED";
    for (int own : OWN.get(body)) if (own == signIndex) return "OWN";
    return null;
  }

  public static boolean isCombust(String body, double longitude, boolean retrograde, double sunLongitude) {
    double[] orb = COMBUST_ORB.get(body);
    if (orb == null || Double.isNaN(sunLongitude)) return false;
    double diff = Math.abs(AstroMath.norm(longitude) - AstroMath.norm(sunLongitude));
    double separation = Math.min(diff, 360.0 - diff);
    return separation <= orb[retrograde ? 1 : 0];
  }
}
