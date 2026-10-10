package com.celestia.astro.service;

import java.time.Instant;
import java.time.LocalDate;

/** Sunrise and sunset from the NOAA solar position equations (standard 0.833 degree horizon). */
final class SunTimes {
  private SunTimes() {}

  static Instant sunrise(LocalDate date, double latitude, double longitude) {
    return event(date, latitude, longitude, true);
  }

  static Instant sunset(LocalDate date, double latitude, double longitude) {
    return event(date, latitude, longitude, false);
  }

  private static Instant event(LocalDate date, double lat, double lon, boolean rise) {
    long utcMidnight = date.toEpochDay() * 86_400_000L;
    double jd0 = utcMidnight / 86_400_000.0 + 2440587.5;
    double minutes = 720;
    boolean found = true;
    for (int i = 0; i < 3 && found; i++) {
      double t = (jd0 + minutes / 1440.0 - 2451545.0) / 36525.0;
      double l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
      double m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
      double e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
      double c = Math.sin(Math.toRadians(m)) * (1.914602 - t * (0.004817 + 0.000014 * t))
          + Math.sin(Math.toRadians(2 * m)) * (0.019993 - 0.000101 * t) + Math.sin(Math.toRadians(3 * m)) * 0.000289;
      double omega = 125.04 - 1934.136 * t;
      double lambda = l0 + c - 0.00569 - 0.00478 * Math.sin(Math.toRadians(omega));
      double eps = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
          + 0.00256 * Math.cos(Math.toRadians(omega));
      double decl = Math.toDegrees(Math.asin(Math.sin(Math.toRadians(eps)) * Math.sin(Math.toRadians(lambda))));
      double y = Math.pow(Math.tan(Math.toRadians(eps / 2)), 2);
      double eqTime = 4 * Math.toDegrees(y * Math.sin(2 * Math.toRadians(l0)) - 2 * e * Math.sin(Math.toRadians(m))
          + 4 * e * y * Math.sin(Math.toRadians(m)) * Math.cos(2 * Math.toRadians(l0))
          - 0.5 * y * y * Math.sin(4 * Math.toRadians(l0)) - 1.25 * e * e * Math.sin(2 * Math.toRadians(m)));
      double cosHa = Math.cos(Math.toRadians(90.833)) / (Math.cos(Math.toRadians(lat)) * Math.cos(Math.toRadians(decl)))
          - Math.tan(Math.toRadians(lat)) * Math.tan(Math.toRadians(decl));
      if (cosHa < -1 || cosHa > 1) {
        found = false;
        break;
      }
      double ha = Math.toDegrees(Math.acos(cosHa));
      minutes = 720 - 4 * (lon + (rise ? ha : -ha)) - eqTime;
    }
    // In polar day or night fall back to 06:00 and 18:00 local solar time.
    if (!found) minutes = 720 - 4 * lon + (rise ? -360 : 360);
    return Instant.ofEpochMilli(utcMidnight + Math.round(minutes * 60_000));
  }
}
