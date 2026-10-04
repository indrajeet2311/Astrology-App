package com.celestia.astro.service;

import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.HouseSystem;
import com.celestia.astro.model.SaturnCyclesResponse;
import com.celestia.astro.model.SaturnCyclesResponse.Period;
import com.celestia.astro.model.SlowTransitsResponse;
import com.celestia.astro.model.TransitCalendarResponse;
import com.celestia.astro.model.TransitCalendarResponse.CalendarEvent;
import com.celestia.astro.model.TransitCalendarResponse.MonthSnapshot;
import com.celestia.astro.model.TransitCalendarResponse.Placement;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SwissEph;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

/** Long-range Saturn cycles and a 12-month calendar of ingresses, stations and eclipses. */
@Service
public class TransitCalendarService {
  private static final int MIN_YEAR = 1800;
  private static final int MAX_YEAR = 2100;

  private record Planet(String name, int id) {}

  private static final List<Planet> MOVERS = List.of(
      new Planet("Sun", SweConst.SE_SUN), new Planet("Mars", SweConst.SE_MARS),
      new Planet("Mercury", SweConst.SE_MERCURY), new Planet("Venus", SweConst.SE_VENUS),
      new Planet("Jupiter", SweConst.SE_JUPITER), new Planet("Saturn", SweConst.SE_SATURN));

  private final SwissEphemerisCalculator calculator;

  public TransitCalendarService(SwissEphemerisCalculator calculator) {
    this.calculator = calculator;
  }

  private ChartResponse natal(BirthRequest b) {
    return calculator.calculate(b.name(), LocalDateTime.of(b.date(), b.time()), b.placeName(), b.latitude(),
        b.longitude(), b.timeZone(), b.ayanamsa(), null, Boolean.TRUE.equals(b.trueNode()),
      b.houseSystem() == null ? HouseSystem.WHOLE_SIGN : b.houseSystem(), Boolean.TRUE.equals(b.laterOffset()));
  }

  private static int signNumber(double longitude) {
    return AstroMath.sign(longitude) + 1;
  }

  // ---------------------------------------------------------------- Sade Sati and Dhaiya history

  private record Phase(String kind, String phase) {}

  private static Phase phaseFor(int saturnSign, int moonSign) {
    return switch (Math.floorMod(saturnSign - moonSign, 12)) {
      case 11 -> new Phase("Sade Sati", "Rising");
      case 0 -> new Phase("Sade Sati", "Peak");
      case 1 -> new Phase("Sade Sati", "Setting");
      case 3 -> new Phase("Dhaiya", "Kantaka (4th from Moon)");
      case 7 -> new Phase("Dhaiya", "Ashtama (8th from Moon)");
      default -> null;
    };
  }

  public SaturnCyclesResponse saturnCycles(BirthRequest birth) {
    ChartResponse natal = natal(birth);
    int moonSign = natal.planets().get(1).signNumber();
    ZoneId zone = ZoneId.of(birth.timeZone());
    Instant start = LocalDateTime.of(birth.date(), birth.time()).atZone(zone).toInstant();
    Instant limit = LocalDate.of(MAX_YEAR, 12, 31).atStartOfDay(zone).toInstant();
    Instant end = start.plus(Duration.ofDays(365L * 100));
    if (end.isAfter(limit)) end = limit;
    Instant now = Instant.now();

    SwissEph swe = new SwissEph();
    List<Period> periods = new ArrayList<>();
    String currentSign;
    try {
      swe.swe_set_sid_mode(SwissEphemerisCalculator.sidMode(birth.ayanamsa()), 0, 0);
      currentSign = AstroMath.signName(AstroMath.sign(Ephem.calc(swe, now, SweConst.SE_SATURN).longitude()));
      Instant periodStart = start;
      int sign = signNumber(Ephem.calc(swe, start, SweConst.SE_SATURN).longitude());
      Phase phase = phaseFor(sign, moonSign);
      Instant previous = start;
      for (Instant t = start.plus(Duration.ofDays(5)); ; t = t.plus(Duration.ofDays(5))) {
        boolean last = !t.isBefore(end);
        Instant at = last ? end : t;
        int s = signNumber(Ephem.calc(swe, at, SweConst.SE_SATURN).longitude());
        Phase next = phaseFor(s, moonSign);
        if (!Objects.equals(next, phase)) {
          Phase before = phase;
          Instant boundary = Ephem.firstTrue(previous, at, x ->
              !Objects.equals(phaseFor(signNumber(Ephem.calc(swe, x, SweConst.SE_SATURN).longitude()), moonSign), before));
          if (before != null) periods.add(period(before, sign, periodStart, boundary, zone, now));
          periodStart = boundary;
          phase = next;
        }
        sign = s;
        previous = at;
        if (last) break;
      }
      if (phase != null) periods.add(period(phase, sign, periodStart, end, zone, now));
    } finally {
      swe.swe_close();
    }
    return new SaturnCyclesResponse(AstroMath.signName(moonSign - 1), currentSign, periods);
  }

  private static Period period(Phase p, int sign, Instant from, Instant to, ZoneId zone, Instant now) {
    return new Period(p.kind(), p.phase(), AstroMath.signName(sign - 1),
        from.atZone(zone).toLocalDate().toString(), to.atZone(zone).toLocalDate().toString(),
        !now.isBefore(from) && now.isBefore(to));
  }

  // ---------------------------------------------------------------- slow-planet sign segments

  public SlowTransitsResponse slowTransits(SlowTransitsResponse.Request request) {
    BirthRequest birth = request.birth();
    ZoneId zone = ZoneId.of(birth.timeZone());
    LocalDate from = request.from();
    LocalDate to = request.to();
    if (from.getYear() < MIN_YEAR || to.getYear() > MAX_YEAR || !to.isAfter(from)) {
      throw new IllegalArgumentException("The range must lie between " + MIN_YEAR + " and " + MAX_YEAR + ".");
    }
    if (from.plusYears(80).isBefore(to)) {
      throw new IllegalArgumentException("The range may not exceed 80 years.");
    }
    boolean trueNode = Boolean.TRUE.equals(birth.trueNode());
    Instant start = from.atStartOfDay(zone).toInstant();
    Instant end = to.atStartOfDay(zone).toInstant();
    SwissEph swe = new SwissEph();
    try {
      swe.swe_set_sid_mode(SwissEphemerisCalculator.sidMode(birth.ayanamsa()), 0, 0);
      return new SlowTransitsResponse(from.toString(), to.toString(), List.of(
          new SlowTransitsResponse.Track("Jupiter", segments(at -> Ephem.calc(swe, at, SweConst.SE_JUPITER), start, end, zone)),
          new SlowTransitsResponse.Track("Saturn", segments(at -> Ephem.calc(swe, at, SweConst.SE_SATURN), start, end, zone)),
          new SlowTransitsResponse.Track("Rahu", segments(at -> Ephem.node(swe, at, trueNode, false), start, end, zone))));
    } finally {
      swe.swe_close();
    }
  }

  private static List<SlowTransitsResponse.Segment> segments(BodyAt source, Instant start, Instant end, ZoneId zone) {
    List<SlowTransitsResponse.Segment> result = new ArrayList<>();
    Instant segmentStart = start;
    int sign = signNumber(source.at(start).longitude());
    Instant previous = start;
    for (Instant t = start.plus(Duration.ofDays(4)); ; t = t.plus(Duration.ofDays(4))) {
      boolean last = !t.isBefore(end);
      Instant at = last ? end : t;
      int s = signNumber(source.at(at).longitude());
      if (s != sign) {
        final int before = sign;
        Instant boundary = Ephem.firstTrue(previous, at, x -> signNumber(source.at(x).longitude()) != before);
        result.add(new SlowTransitsResponse.Segment(sign, date(segmentStart, zone), date(boundary, zone)));
        segmentStart = boundary;
        sign = s;
      }
      previous = at;
      if (last) break;
    }
    result.add(new SlowTransitsResponse.Segment(sign, date(segmentStart, zone), date(end, zone)));
    return result;
  }

  private static String date(Instant instant, ZoneId zone) {
    return instant.atZone(zone).toLocalDate().toString();
  }

  // ---------------------------------------------------------------- 12-month transit calendar

  public TransitCalendarResponse calendar(TransitCalendarResponse.Request request) {
    BirthRequest birth = request.birth();
    ChartResponse natal = natal(birth);
    int ascSign = natal.ascendant().signNumber();
    int moonSign = natal.planets().get(1).signNumber();
    boolean trueNode = Boolean.TRUE.equals(birth.trueNode());
    ZoneId zone = ZoneId.of(birth.timeZone());
    LocalDate fromDate = request.from() != null ? request.from() : LocalDate.now(zone);
    if (fromDate.getYear() < MIN_YEAR || fromDate.getYear() >= MAX_YEAR) {
      throw new IllegalArgumentException("Calendar start must be between " + MIN_YEAR + " and " + (MAX_YEAR - 1) + ".");
    }
    LocalDate toDate = fromDate.plusYears(1);
    Instant start = fromDate.atStartOfDay(zone).toInstant();
    Instant end = toDate.atStartOfDay(zone).toInstant();

    List<CalendarEvent> events = new ArrayList<>();
    List<MonthSnapshot> months = new ArrayList<>();
    SwissEph swe = new SwissEph();
    try {
      swe.swe_set_sid_mode(SwissEphemerisCalculator.sidMode(birth.ayanamsa()), 0, 0);

      for (Planet planet : MOVERS) {
        trackPlanet(planet.name(), at -> Ephem.calc(swe, at, planet.id()), true, start, end, ascSign, moonSign, events);
      }
      trackPlanet("Rahu", at -> Ephem.node(swe, at, trueNode, false), false, start, end, ascSign, moonSign, events);
      trackPlanet("Ketu", at -> Ephem.node(swe, at, trueNode, true), false, start, end, ascSign, moonSign, events);
      trackEclipses(swe, start, end, ascSign, moonSign, events);

      for (int i = 0; i < 12; i++) {
        Instant at = fromDate.plusMonths(i).atTime(12, 0).atZone(zone).toInstant();
        List<Placement> placements = new ArrayList<>();
        for (Planet p : List.of(new Planet("Jupiter", SweConst.SE_JUPITER), new Planet("Saturn", SweConst.SE_SATURN),
            new Planet("Mars", SweConst.SE_MARS))) {
          Ephem.Body b = Ephem.calc(swe, at, p.id());
          placements.add(placement(p.name(), b, ascSign, moonSign));
        }
        placements.add(placement("Rahu", Ephem.node(swe, at, trueNode, false), ascSign, moonSign));
        placements.add(placement("Ketu", Ephem.node(swe, at, trueNode, true), ascSign, moonSign));
        months.add(new MonthSnapshot(fromDate.plusMonths(i).toString(), placements));
      }
    } finally {
      swe.swe_close();
    }
    events.sort(Comparator.comparing(CalendarEvent::at));
    return new TransitCalendarResponse(fromDate.toString(), toDate.toString(),
        AstroMath.signName(ascSign - 1), AstroMath.signName(moonSign - 1), List.copyOf(events), List.copyOf(months));
  }

  private static Placement placement(String name, Ephem.Body b, int ascSign, int moonSign) {
    int sign = signNumber(b.longitude());
    boolean node = name.equals("Rahu") || name.equals("Ketu");
    return new Placement(name, AstroMath.signName(sign - 1), sign, Math.floorMod(sign - ascSign, 12) + 1,
        Math.floorMod(sign - moonSign, 12) + 1, node || b.speed() < 0);
  }

  private interface BodyAt {
    Ephem.Body at(Instant instant);
  }

  private void trackPlanet(String name, BodyAt source, boolean stations, Instant start, Instant end,
                           int ascSign, int moonSign, List<CalendarEvent> out) {
    Instant previousTime = start;
    Ephem.Body previous = source.at(start);
    for (Instant t = start.plus(Duration.ofDays(1)); !previousTime.isAfter(end); t = t.plus(Duration.ofDays(1))) {
      Instant at = t.isAfter(end) ? end : t;
      Ephem.Body current = source.at(at);
      int before = signNumber(previous.longitude());
      int after = signNumber(current.longitude());
      if (before != after) {
        Instant moment = Ephem.firstTrue(previousTime, at, x -> signNumber(source.at(x).longitude()) != before);
        Ephem.Body b = source.at(moment);
        int sign = signNumber(b.longitude());
        boolean retro = !name.equals("Rahu") && !name.equals("Ketu") && b.speed() < 0;
        out.add(new CalendarEvent(moment.toString(), "INGRESS", name,
            name + " enters " + AstroMath.signName(sign - 1) + (retro ? " (retrograde)" : ""),
            AstroMath.signName(sign - 1), Math.floorMod(sign - ascSign, 12) + 1,
            Math.floorMod(sign - moonSign, 12) + 1, ""));
      }
      if (stations && !name.equals("Sun") && Math.signum(previous.speed()) != Math.signum(current.speed())) {
        boolean turnsRetro = current.speed() < 0;
        Instant moment = Ephem.firstTrue(previousTime, at, x -> (source.at(x).speed() < 0) == turnsRetro);
        int sign = signNumber(source.at(moment).longitude());
        out.add(new CalendarEvent(moment.toString(), turnsRetro ? "RETROGRADE" : "DIRECT", name,
            name + (turnsRetro ? " turns retrograde" : " turns direct") + " in " + AstroMath.signName(sign - 1),
            AstroMath.signName(sign - 1), Math.floorMod(sign - ascSign, 12) + 1,
            Math.floorMod(sign - moonSign, 12) + 1, ""));
      }
      previous = current;
      previousTime = at;
      if (at.equals(end)) break;
    }
  }

  private void trackEclipses(SwissEph swe, Instant start, Instant end, int ascSign, int moonSign,
                             List<CalendarEvent> out) {
    // Phase angle of the Moon minus the Sun; new moon at 0 degrees and full moon at 180.
    java.util.function.ToDoubleFunction<Instant> elongation = at ->
        Ephem.calc(swe, at, SweConst.SE_MOON).longitude() - Ephem.calc(swe, at, SweConst.SE_SUN).longitude();
    Instant previous = start;
    for (Instant t = start.plus(Duration.ofHours(12)); ; t = t.plus(Duration.ofHours(12))) {
      Instant at = t.isAfter(end) ? end : t;
      for (int kind = 0; kind < 2; kind++) {
        double offset = kind == 0 ? 0 : 180;
        double a = Ephem.signedAngle(elongation.applyAsDouble(previous), offset);
        double b = Ephem.signedAngle(elongation.applyAsDouble(at), offset);
        if (a < 0 && b >= 0 && Math.abs(a - b) < 90) {
          Instant moment = Ephem.firstTrue(previous, at,
              x -> Ephem.signedAngle(elongation.applyAsDouble(x), offset) >= 0);
          Ephem.Body moon = Ephem.calc(swe, moment, SweConst.SE_MOON);
          boolean solar = kind == 0;
          double limit = solar ? 1.5 : 1.1;
          if (Math.abs(moon.latitude()) < limit) {
            int sign = signNumber(moon.longitude());
            out.add(new CalendarEvent(moment.toString(), solar ? "SOLAR_ECLIPSE" : "LUNAR_ECLIPSE",
                solar ? "Sun" : "Moon", (solar ? "Solar" : "Lunar") + " eclipse in " + AstroMath.signName(sign - 1),
                AstroMath.signName(sign - 1), Math.floorMod(sign - ascSign, 12) + 1,
                Math.floorMod(sign - moonSign, 12) + 1,
                "Moon's latitude " + String.format("%.2f", moon.latitude()) + " degrees; visibility depends on location."));
          }
        }
      }
      previous = at;
      if (at.equals(end)) break;
    }
  }
}
