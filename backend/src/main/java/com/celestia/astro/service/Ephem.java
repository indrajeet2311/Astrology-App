package com.celestia.astro.service;

import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SwissEph;

import java.time.Instant;
import java.util.function.Predicate;

/** Small helpers over the Moshier ephemeris shared by the timeline services. */
final class Ephem {
  private static final int FLAGS = SweConst.SEFLG_MOSEPH | SweConst.SEFLG_SIDEREAL | SweConst.SEFLG_SPEED;

  private Ephem() {}

  /** Sidereal longitude, ecliptic latitude and daily speed in longitude. */
  record Body(double longitude, double latitude, double speed) {}

  static Body calc(SwissEph swe, Instant at, int bodyId) {
    double[] xx = new double[6];
    StringBuffer err = new StringBuffer();
    if (swe.swe_calc_ut(SwissEphemerisCalculator.julianDay(at), bodyId, FLAGS, xx, err) < 0) {
      throw new IllegalStateException("Ephemeris calculation failed: " + err);
    }
    return new Body(AstroMath.norm(xx[0]), xx[1], xx[3]);
  }

  /** Ketu mirrors Rahu, so callers pass the node id and flip by 180 degrees. */
  static Body node(SwissEph swe, Instant at, boolean trueNode, boolean ketu) {
    Body b = calc(swe, at, trueNode ? SweConst.SE_TRUE_NODE : SweConst.SE_MEAN_NODE);
    return ketu ? new Body(AstroMath.norm(b.longitude() + 180.0), -b.latitude(), b.speed()) : b;
  }

  /** Shortest signed difference a - b in degrees, in (-180, 180]. */
  static double signedAngle(double a, double b) {
    return AstroMath.norm(a - b + 180.0) - 180.0;
  }

  /** Earliest instant in (left, right] where the predicate turns true, to within one minute. */
  static Instant firstTrue(Instant left, Instant right, Predicate<Instant> test) {
    Instant lo = left;
    Instant hi = right;
    while (hi.toEpochMilli() - lo.toEpochMilli() > 60_000) {
      Instant mid = Instant.ofEpochMilli(lo.toEpochMilli() + (hi.toEpochMilli() - lo.toEpochMilli()) / 2);
      if (test.test(mid)) hi = mid;
      else lo = mid;
    }
    return hi;
  }
}
