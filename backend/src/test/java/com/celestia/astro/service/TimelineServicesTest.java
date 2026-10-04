package com.celestia.astro.service;

import com.celestia.astro.model.Ayanamsa;
import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.FestivalCalendarResponse;
import com.celestia.astro.model.FestivalCalendarResponse.Event;
import com.celestia.astro.model.SaturnCyclesResponse;
import com.celestia.astro.model.TransitCalendarResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TimelineServicesTest {
  private static final SwissEphemerisCalculator CALCULATOR = new SwissEphemerisCalculator();
  private static final BirthRequest BIRTH = new BirthRequest("Test", LocalDate.of(1995, 5, 20), LocalTime.of(10, 30),
      "Pune", 18.52, 73.86, "Asia/Kolkata", Ayanamsa.LAHIRI, null, false, null, false);

  private static Event find(List<Event> events, String name) {
    return events.stream().filter(e -> e.name().startsWith(name)).findFirst().orElseThrow();
  }

  private static void assertWithinDays(String expected, Event event, long days) {
    long gap = Math.abs(ChronoUnit.DAYS.between(LocalDate.parse(expected), LocalDate.parse(event.date())));
    assertTrue(gap <= days, event.name() + " fell on " + event.date() + ", expected near " + expected);
  }

  @Test
  void festivalCalendarMatchesKnownDates2026() {
    var request = new FestivalCalendarResponse.Request(2026, "Pune", 18.52, 73.86, "Asia/Kolkata", Ayanamsa.LAHIRI);
    FestivalCalendarResponse result = new FestivalCalendarService().calendar(request);

    assertWithinDays("2026-01-14", find(result.events(), "Makara Sankranti"), 1);
    assertWithinDays("2026-02-15", find(result.events(), "Maha Shivaratri"), 1);
    assertWithinDays("2026-03-26", find(result.events(), "Ram Navami"), 1);
    assertWithinDays("2026-09-14", find(result.events(), "Ganesh Chaturthi"), 1);
    assertWithinDays("2026-10-20", find(result.events(), "Vijayadashami"), 1);
    assertWithinDays("2026-11-08", find(result.events(), "Diwali"), 1);

    long ekadashis = result.events().stream().filter(e -> e.category().equals("EKADASHI")).count();
    assertTrue(ekadashis >= 22 && ekadashis <= 28, "Ekadashi count " + ekadashis);
    assertTrue(result.months().stream().anyMatch(m -> m.adhika()), "2026 has an Adhika month");
  }

  @Test
  void saturnCyclesAreOrderedAndNonEmpty() {
    SaturnCyclesResponse result = new TransitCalendarService(CALCULATOR).saturnCycles(BIRTH);
    assertTrue(result.periods().size() >= 3);
    for (var p : result.periods()) {
      assertTrue(!LocalDate.parse(p.end()).isBefore(LocalDate.parse(p.start())));
    }
    assertTrue(result.periods().stream().anyMatch(p -> p.kind().equals("Sade Sati") && p.phase().equals("Peak")));
    assertTrue(result.periods().stream().anyMatch(p -> p.kind().equals("Dhaiya")));
  }

  @Test
  void slowTransitsCoverTheRangeWithoutGaps() {
    var request = new com.celestia.astro.model.SlowTransitsResponse.Request(BIRTH, LocalDate.of(2020, 1, 1), LocalDate.of(2035, 1, 1));
    var result = new TransitCalendarService(CALCULATOR).slowTransits(request);
    assertEquals(3, result.tracks().size());
    for (var track : result.tracks()) {
      var segments = track.segments();
      assertEquals("2020-01-01", segments.get(0).start());
      assertEquals("2035-01-01", segments.get(segments.size() - 1).end());
      assertTrue(segments.stream().allMatch(s -> s.nakshatraIndex() >= 0 && s.nakshatraIndex() < 27));
      for (int i = 1; i < segments.size(); i++) assertEquals(segments.get(i - 1).end(), segments.get(i).start());
    }
    var jupiter = result.tracks().get(0).segments();
    int signChanges = 0;
    boolean hasNakshatraOnlyBoundary = false;
    for (int index = 1; index < jupiter.size(); index++) {
      var previous = jupiter.get(index - 1);
      var current = jupiter.get(index);
      if (previous.signNumber() != current.signNumber()) signChanges++;
      else if (previous.nakshatraIndex() != current.nakshatraIndex()) hasNakshatraOnlyBoundary = true;
      assertTrue(previous.signNumber() != current.signNumber() || previous.nakshatraIndex() != current.nakshatraIndex());
    }
    assertTrue(signChanges >= 14 && signChanges <= 44, "Jupiter sign changes " + signChanges);
    assertTrue(hasNakshatraOnlyBoundary, "Nakshatra changes within a sign must remain separate segments");
  }

  @Test
  void transitCalendarHasIngressesStationsAndEclipses() {
    var request = new TransitCalendarResponse.Request(BIRTH, LocalDate.of(2026, 1, 1));
    TransitCalendarResponse result = new TransitCalendarService(CALCULATOR).calendar(request);

    assertEquals(12, result.months().size());
    long mercuryRetro = result.events().stream()
        .filter(e -> e.type().equals("RETROGRADE") && e.planet().equals("Mercury")).count();
    assertTrue(mercuryRetro >= 2 && mercuryRetro <= 4, "Mercury retrograde count " + mercuryRetro);
    assertTrue(result.events().stream().anyMatch(e -> e.type().equals("INGRESS") && e.planet().equals("Sun")));
    long solar = result.events().stream().filter(e -> e.type().equals("SOLAR_ECLIPSE")).count();
    long lunar = result.events().stream().filter(e -> e.type().equals("LUNAR_ECLIPSE")).count();
    assertTrue(solar >= 1 && solar <= 3 && lunar >= 1 && lunar <= 3, "eclipses " + solar + "/" + lunar);
  }
}
