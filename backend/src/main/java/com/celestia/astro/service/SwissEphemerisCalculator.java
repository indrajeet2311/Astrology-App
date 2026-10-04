package com.celestia.astro.service;

import com.celestia.astro.model.Ayanamsa;
import com.celestia.astro.model.AnnualChartsResponse;
import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.ChartResponse.DailyPanchang;
import com.celestia.astro.model.ChartResponse.Position;
import com.celestia.astro.model.HouseSystem;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SwissEph;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.ToDoubleFunction;

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
      new Body("Saturn", SweConst.SE_SATURN));

  public ChartResponse calculate(String name, LocalDateTime local, String placeName,
                                 double latitude, double longitude, String zoneId, Ayanamsa ayanamsa) {
    return calculate(name, local, placeName, latitude, longitude, zoneId, ayanamsa, null);
  }

  public DailyPanchang calculatePanchang(LocalDate date, String placeName, double latitude, double longitude,
                                         String zoneId, Ayanamsa ayanamsa) {
    if (date.getYear() < MIN_YEAR || date.getYear() > MAX_YEAR) {
      throw new IllegalArgumentException("Date year must be between " + MIN_YEAR + " and " + MAX_YEAR + ".");
    }
    ZoneId zone = ZoneId.of(zoneId);
    Instant instant = date.atTime(12, 0).atZone(zone).toInstant();
    double jdUt = julianDay(instant);
    SwissEph swe = new SwissEph();
    try {
      swe.swe_set_sid_mode(sidMode(ayanamsa), 0, 0);
      double sun = longitudeAt(swe, jdUt, SweConst.SE_SUN);
      double moonLongitude = longitudeAt(swe, jdUt, SweConst.SE_MOON);
      Position moon = position("Moon", moonLongitude, moonLongitude, false, sun, HouseSystem.WHOLE_SIGN);
      return new DailyPanchang(instant.truncatedTo(ChronoUnit.MINUTES).toString(),
          PanchangCalculator.calculate(sun, moonLongitude, date), moon);
    } finally {
      swe.swe_close();
    }
  }

  public AnnualChartsResponse calculateAnnualCharts(BirthRequest birth, int year) {
    LocalDateTime natalLocal = LocalDateTime.of(birth.date(), birth.time());
    if (year < natalLocal.getYear() || year < MIN_YEAR || year > MAX_YEAR) {
      throw new IllegalArgumentException("Return year must be between the birth year and " + MAX_YEAR + ".");
    }
    String zoneId = birth.timeZone();
    ZoneId zone = ZoneId.of(zoneId);
    Instant natalInstant = natalLocal.atZone(zone).toInstant();
    ChartResponse natal = calculate(birth.name(), natalLocal, birth.placeName(), birth.latitude(), birth.longitude(),
        zoneId, birth.ayanamsa(), null, Boolean.TRUE.equals(birth.trueNode()),
        birth.houseSystem() == null ? HouseSystem.WHOLE_SIGN : birth.houseSystem());
    double natalSun = natal.planets().stream().filter(p -> p.name().equals("Sun")).findFirst().orElseThrow().longitude();
    double natalElongation = AstroMath.norm(
        natal.planets().stream().filter(p -> p.name().equals("Moon")).findFirst().orElseThrow().longitude() - natalSun);

    SwissEph swe = new SwissEph();
    Instant solarReturn;
    Instant tithiReturn;
    try {
      swe.swe_set_sid_mode(sidMode(birth.ayanamsa()), 0, 0);
      Instant start = LocalDate.of(year, 1, 1).atStartOfDay(zone).toInstant();
      Instant end = LocalDate.of(year + 1, 1, 1).atStartOfDay(zone).toInstant();
      solarReturn = findForwardCrossing(swe, start, end,
          instant -> longitudeAt(swe, julianDay(instant), SweConst.SE_SUN), natalSun);
      tithiReturn = findForwardCrossing(swe, solarReturn.minus(Duration.ofDays(16)),
          solarReturn.plus(Duration.ofDays(16)), instant -> AstroMath.norm(
              longitudeAt(swe, julianDay(instant), SweConst.SE_MOON)
                  - longitudeAt(swe, julianDay(instant), SweConst.SE_SUN)), natalElongation);
    } finally {
      swe.swe_close();
    }

    ChartResponse varshaphal = calculateAtReturn(birth, solarReturn, zone);
    ChartResponse tithiPravesh = calculateAtReturn(birth, tithiReturn, zone);
    return new AnnualChartsResponse(year, solarReturn.atZone(zone).toOffsetDateTime().toString(), varshaphal,
        tithiReturn.atZone(zone).toOffsetDateTime().toString(), tithiPravesh);
  }

  private ChartResponse calculateAtReturn(BirthRequest birth, Instant event, ZoneId zone) {
    LocalDateTime local = LocalDateTime.ofInstant(event, zone);
    return calculate(birth.name(), local, birth.placeName(), birth.latitude(), birth.longitude(), birth.timeZone(),
        birth.ayanamsa(), local.toLocalDate(), Boolean.TRUE.equals(birth.trueNode()),
        birth.houseSystem() == null ? HouseSystem.WHOLE_SIGN : birth.houseSystem());
  }

  private Instant findForwardCrossing(SwissEph swe, Instant start, Instant end,
                                      ToDoubleFunction<Instant> longitude, double target) {
    Instant left = start;
    double leftDelta = signedAngle(longitude.applyAsDouble(left) - target);
    while (left.isBefore(end)) {
      Instant right = left.plus(Duration.ofHours(6));
      if (right.isAfter(end)) right = end;
      double rightDelta = signedAngle(longitude.applyAsDouble(right) - target);
      if (leftDelta <= 0 && rightDelta >= 0) {
        while (Duration.between(left, right).toMillis() > 1000) {
          Instant middle = left.plusMillis(Duration.between(left, right).toMillis() / 2);
          if (signedAngle(longitude.applyAsDouble(middle) - target) < 0) left = middle;
          else right = middle;
        }
        return right;
      }
      left = right;
      leftDelta = rightDelta;
    }
    throw new IllegalArgumentException("Could not find the requested annual return in that year.");
  }

  private static double signedAngle(double angle) {
    return AstroMath.norm(angle + 180.0) - 180.0;
  }

  public ChartResponse calculate(String name, LocalDateTime local, String placeName,
                                 double latitude, double longitude, String zoneId, Ayanamsa ayanamsa,
                                 LocalDate transitDate) {
    return calculate(name, local, placeName, latitude, longitude, zoneId, ayanamsa, transitDate, false,
      HouseSystem.WHOLE_SIGN);
    }

    public ChartResponse calculate(String name, LocalDateTime local, String placeName,
                   double latitude, double longitude, String zoneId, Ayanamsa ayanamsa,
                   LocalDate transitDate, boolean trueNode, HouseSystem requestedHouseSystem) {
    if (local.getYear() < MIN_YEAR || local.getYear() > MAX_YEAR) {
      throw new IllegalArgumentException("Birth year must be between " + MIN_YEAR + " and " + MAX_YEAR + ".");
    }
    if (transitDate != null && (transitDate.getYear() < MIN_YEAR || transitDate.getYear() > MAX_YEAR)) {
      throw new IllegalArgumentException("Transit year must be between " + MIN_YEAR + " and " + MAX_YEAR + ".");
    }
    ZoneId zone = ZoneId.of(zoneId);
    HouseSystem houseSystem = requestedHouseSystem == null ? HouseSystem.WHOLE_SIGN : requestedHouseSystem;
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

      List<Position> planets = planetsAt(swe, jdUt, ascLongitude, trueNode, houseSystem);

      double ayanamsaDegrees = swe.swe_get_ayanamsa_ut(jdUt);
      ZonedDateTime utc = zoned.withZoneSameInstant(ZoneOffset.UTC);
      var details = new ChartResponse.BirthDetails(
          name == null || name.isBlank() ? null : name.trim(),
          local.toLocalDate().toString(), local.toLocalTime().toString(),
          zoned.getOffset().getId(), utc.toLocalDateTime().toString() + "Z",
          placeName, latitude, longitude, zoneId, ayanamsa, ayanamsaDegrees, trueNode, houseSystem);
      Position moon = planets.get(1);
      var dashas = VimshottariDasha.compute(moon.longitude(), zoned.toInstant(), zone);
      var yoginiDashas = YoginiDasha.compute(moon.longitude(), zoned.toInstant(), zone);
      Position ascendant = position("Ascendant", ascLongitude, ascLongitude, false, Double.NaN, houseSystem);
      var charaDashas = CharaDasha.compute(ascendant.signNumber(), planets, zoned.toInstant(), zone);

      // Transit houses are counted from the natal Ascendant; Sade Sati is judged from the natal Moon sign.
        Instant transitInstant = transitDate == null
          ? Instant.now()
          : transitDate.atTime(12, 0).atZone(zone).toInstant();
      List<Position> transitPlanets = planetsAt(swe, julianDay(transitInstant), ascLongitude, trueNode, houseSystem);
      Position saturn = transitPlanets.get(6);
        var transits = new ChartResponse.Transits(transitInstant.truncatedTo(ChronoUnit.MINUTES).toString(), transitPlanets,
          ChartInsights.sadeSati(moon.signNumber(), saturn.signNumber()));
      return new ChartResponse(details, ascendant, planets, dashas, yoginiDashas, charaDashas,
          ChartInsights.aspects(planets), ChartInsights.yogas(ascendant, planets), transits,
          PanchangCalculator.calculate(planets.get(0).longitude(), moon.longitude(), local.toLocalDate()));
    } finally {
      swe.swe_close();
    }
  }

  /** Sidereal positions of the nine grahas at {@code jdUt}; the sidereal mode must already be set on {@code swe}. */
  private List<Position> planetsAt(SwissEph swe, double jdUt, double ascLongitude,
                                   boolean trueNode, HouseSystem houseSystem) {
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
      Position p = position(body.name(), xx[0], ascLongitude, xx[3] < 0, sunLongitude, houseSystem);
      planets.add(p);
    }
    double[] nodeValues = new double[6];
    StringBuffer nodeError = new StringBuffer();
    int nodeId = trueNode ? SweConst.SE_TRUE_NODE : SweConst.SE_MEAN_NODE;
    if (swe.swe_calc_ut(jdUt, nodeId, flags, nodeValues, nodeError) < 0) {
      throw new IllegalStateException("Ephemeris calculation failed for Rahu: " + nodeError);
    }
    rahu = position("Rahu", nodeValues[0], ascLongitude, nodeValues[3] < 0, sunLongitude, houseSystem);
    planets.add(rahu);
    // Ketu is always exactly opposite Rahu and moves with it.
    planets.add(position("Ketu", rahu.longitude() + 180.0, ascLongitude, rahu.retrograde(), sunLongitude, houseSystem));
    return planets;
  }

  private static double longitudeAt(SwissEph swe, double jdUt, int bodyId) {
    double[] values = new double[6];
    StringBuffer err = new StringBuffer();
    int flags = SweConst.SEFLG_MOSEPH | SweConst.SEFLG_SIDEREAL;
    if (swe.swe_calc_ut(jdUt, bodyId, flags, values, err) < 0) {
      throw new IllegalStateException("Ephemeris calculation failed: " + err);
    }
    return values[0];
  }

  private static Position position(String name, double rawLongitude, double ascLongitude, boolean retrograde,
                                   double sunLongitude, HouseSystem houseSystem) {
    double lon = AstroMath.norm(rawLongitude);
    int sign = AstroMath.sign(lon);
    int navamsa = AstroMath.navamsaSign(lon);
    Map<String, Integer> divisionalSigns = new LinkedHashMap<>();
    for (int division : new int[] {1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60}) {
      divisionalSigns.put("D" + division, AstroMath.divisionalSign(lon, division) + 1);
    }
    return new Position(name, lon, AstroMath.signName(sign), sign + 1, AstroMath.house(lon, ascLongitude, houseSystem),
        lon - sign * 30.0, AstroMath.nakshatra(lon), AstroMath.pada(lon), retrograde,
        navamsa + 1, Dignity.dignity(name, sign), Dignity.isCombust(name, lon, retrograde, sunLongitude),
        navamsa == sign, Map.copyOf(divisionalSigns));
  }

  private static int sidMode(Ayanamsa ayanamsa) {
    return switch (ayanamsa) {
      case LAHIRI -> SweConst.SE_SIDM_LAHIRI;
      case RAMAN -> SweConst.SE_SIDM_RAMAN;
      case KRISHNAMURTI -> SweConst.SE_SIDM_KRISHNAMURTI;
      case TRUE_CHITRA -> SweConst.SE_SIDM_TRUE_CITRA;
      case YUKTESHWAR -> SweConst.SE_SIDM_YUKTESHWAR;
    };
  }

  /** Julian day in UT (UTC is used as UT; the difference is under a second). */
  static double julianDay(Instant instant) {
    return 2440587.5 + instant.toEpochMilli() / 86_400_000.0;
  }
}
