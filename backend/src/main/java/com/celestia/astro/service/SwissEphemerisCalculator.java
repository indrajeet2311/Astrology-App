package com.celestia.astro.service;

import com.celestia.astro.model.Ayanamsa;
import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.ChartResponse.Position;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SwissEph;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Sidereal chart calculation using the built-in Moshier ephemeris (no data files required). */
@Service
public class SwissEphemerisCalculator {
  private static final int MIN_YEAR = 1800;
  private static final int MAX_YEAR = 2100;

  private record Body(String name, int id) {}

  private static final List<Body> BODIES = List.of(
      new Body("Sun", SweConst.SE_SUN),
      new Body("Moon", SweConst.SE_MOON),
      new Body("Mars", SweConst.SE_MARS),
      new Body("Mercury", SweConst.SE_MERCURY),
      new Body("Jupiter", SweConst.SE_JUPITER),
      new Body("Venus", SweConst.SE_VENUS),
      new Body("Saturn", SweConst.SE_SATURN),
      new Body("Rahu", SweConst.SE_MEAN_NODE));

  public ChartResponse calculate(String name, LocalDateTime local, String placeName,
                                 double latitude, double longitude, String zoneId, Ayanamsa ayanamsa) {
    if (local.getYear() < MIN_YEAR || local.getYear() > MAX_YEAR) {
      throw new IllegalArgumentException("Birth year must be between " + MIN_YEAR + " and " + MAX_YEAR + ".");
    }
    ZoneId zone = ZoneId.of(zoneId);
    if (zone.getRules().getValidOffsets(local).isEmpty()) {
      throw new IllegalArgumentException(
          "That local time does not exist in " + zoneId + " (clocks skipped forward). Check the birth time.");
    }
    // For a repeated hour at the end of daylight saving, java.time picks the earlier (daylight) offset.
    ZonedDateTime zoned = local.atZone(zone);
    double jdUt = julianDay(zoned.toInstant());

    SwissEph swe = new SwissEph();
    try {
      swe.swe_set_sid_mode(sidMode(ayanamsa), 0, 0);

      // The sidereal house routine in this port writes past index 12, so use the largest documented size.
      double[] cusps = new double[37];
      double[] ascmc = new double[10];
      if (swe.swe_houses(jdUt, SweConst.SEFLG_SIDEREAL, latitude, longitude, 'W', cusps, ascmc) < 0) {
        throw new IllegalStateException("Could not calculate the Ascendant for this place and time.");
      }
      double ascLongitude = AstroMath.norm(ascmc[0]);

      List<Position> planets = planetsAt(swe, jdUt, ascLongitude);

      double ayanamsaDegrees = swe.swe_get_ayanamsa_ut(jdUt);
      ZonedDateTime utc = zoned.withZoneSameInstant(ZoneOffset.UTC);
      var details = new ChartResponse.BirthDetails(
          name == null || name.isBlank() ? null : name.trim(),
          local.toLocalDate().toString(), local.toLocalTime().toString(),
          zoned.getOffset().getId(), utc.toLocalDateTime().toString() + "Z",
          placeName, latitude, longitude, zoneId, ayanamsa, ayanamsaDegrees);
      Position moon = planets.get(1);
      var dashas = VimshottariDasha.compute(moon.longitude(), zoned.toInstant(), zone);
      Position ascendant = position("Ascendant", ascLongitude, ascLongitude, false, Double.NaN);

      // Transit houses are counted from the natal Ascendant; Sade Sati is judged from the natal Moon sign.
      Instant now = Instant.now();
      List<Position> transitPlanets = planetsAt(swe, julianDay(now), ascLongitude);
      Position saturn = transitPlanets.get(6);
      var transits = new ChartResponse.Transits(now.truncatedTo(ChronoUnit.MINUTES).toString(), transitPlanets,
          ChartInsights.sadeSati(moon.signNumber(), saturn.signNumber()));
      return new ChartResponse(details, ascendant, planets, dashas,
          ChartInsights.aspects(planets), ChartInsights.yogas(ascendant, planets), transits,
          PanchangCalculator.calculate(planets.get(0).longitude(), moon.longitude(), local.toLocalDate()));
    } finally {
      swe.swe_close();
    }
  }

  /** Sidereal positions of the nine grahas at {@code jdUt}; the sidereal mode must already be set on {@code swe}. */
  private List<Position> planetsAt(SwissEph swe, double jdUt, double ascLongitude) {
    int flags = SweConst.SEFLG_MOSEPH | SweConst.SEFLG_SIDEREAL | SweConst.SEFLG_SPEED;
    List<Position> planets = new ArrayList<>();
    Position rahu = null;
    double sunLongitude = Double.NaN;
    for (Body body : BODIES) {
      double[] xx = new double[6];
      StringBuffer err = new StringBuffer();
      if (swe.swe_calc_ut(jdUt, body.id(), flags, xx, err) < 0) {
        throw new IllegalStateException("Ephemeris calculation failed for " + body.name() + ": " + err);
      }
      if (body.name().equals("Sun")) sunLongitude = AstroMath.norm(xx[0]);
      Position p = position(body.name(), xx[0], ascLongitude, xx[3] < 0, sunLongitude);
      planets.add(p);
      if (body.name().equals("Rahu")) rahu = p;
    }
    // Ketu is always exactly opposite Rahu and moves with it.
    planets.add(position("Ketu", rahu.longitude() + 180.0, ascLongitude, rahu.retrograde(), sunLongitude));
    return planets;
  }

  private static Position position(String name, double rawLongitude, double ascLongitude, boolean retrograde,
                                   double sunLongitude) {
    double lon = AstroMath.norm(rawLongitude);
    int sign = AstroMath.sign(lon);
    int navamsa = AstroMath.navamsaSign(lon);
    Map<String, Integer> divisionalSigns = new LinkedHashMap<>();
    for (int division : new int[] {1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60}) {
      divisionalSigns.put("D" + division, AstroMath.divisionalSign(lon, division) + 1);
    }
    return new Position(name, lon, AstroMath.signName(sign), sign + 1, AstroMath.house(lon, ascLongitude),
        lon - sign * 30.0, AstroMath.nakshatra(lon), AstroMath.pada(lon), retrograde,
        navamsa + 1, Dignity.dignity(name, sign), Dignity.isCombust(name, lon, retrograde, sunLongitude),
        navamsa == sign, Map.copyOf(divisionalSigns));
  }

  private static int sidMode(Ayanamsa ayanamsa) {
    return switch (ayanamsa) {
      case LAHIRI -> SweConst.SE_SIDM_LAHIRI;
      case RAMAN -> SweConst.SE_SIDM_RAMAN;
      case KRISHNAMURTI -> SweConst.SE_SIDM_KRISHNAMURTI;
    };
  }

  /** Julian day in UT (UTC is used as UT; the difference is under a second). */
  static double julianDay(Instant instant) {
    return 2440587.5 + instant.toEpochMilli() / 86_400_000.0;
  }
}
