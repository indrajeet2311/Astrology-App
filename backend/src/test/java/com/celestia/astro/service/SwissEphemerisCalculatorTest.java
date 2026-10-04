package com.celestia.astro.service;

import com.celestia.astro.model.Ayanamsa;
import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.ChartResponse;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SwissEphemerisCalculatorTest {
  private final SwissEphemerisCalculator calculator = new SwissEphemerisCalculator();

  @Test
  void repeatedDaylightSavingTimeCanSelectEitherOccurrence() {
    LocalDateTime repeated = LocalDateTime.of(2024, 11, 3, 1, 30);
    ChartResponse earlier = calculator.calculate("Test", repeated, "New York", 40.7128, -74.006,
        "America/New_York", Ayanamsa.LAHIRI, null, false, null, false);
    ChartResponse later = calculator.calculate("Test", repeated, "New York", 40.7128, -74.006,
        "America/New_York", Ayanamsa.LAHIRI, null, false, null, true);

    assertEquals("-04:00", earlier.birthDetails().utcOffset());
    assertEquals("2024-11-03T05:30Z", earlier.birthDetails().utcTime());
    assertEquals("-05:00", later.birthDetails().utcOffset());
    assertEquals("2024-11-03T06:30Z", later.birthDetails().utcTime());
    assertTrue(later.birthDetails().laterOffset());
  }

  @Test
  void daylightSavingGapIsRejectedAsANonexistentLocalTime() {
    LocalDateTime skipped = LocalDateTime.of(2024, 3, 10, 2, 30);
    assertThrows(IllegalArgumentException.class, () -> calculator.calculate("Test", skipped, "New York", 40.7128,
        -74.006, "America/New_York", Ayanamsa.LAHIRI, null, false, null, false));
  }

  @Test
  void j2000SunMatchesKnownLahiriPosition() {
    // 2000-01-01 12:00 UT: tropical Sun ~280.37 deg, Lahiri ayanamsa ~23.86 deg => ~256.51 sidereal.
    ChartResponse chart = calculator.calculate("Test", LocalDateTime.of(2000, 1, 1, 12, 0),
        "Greenwich", 51.4769, 0.0, "UTC", Ayanamsa.LAHIRI);

    var sun = chart.planets().get(0);
    assertEquals("Sun", sun.name());
    assertEquals(256.51, sun.longitude(), 0.05);
    assertEquals("Sagittarius", sun.sign());
    assertEquals(23.86, chart.birthDetails().ayanamsaDegrees(), 0.02);
  }

  @Test
  void chartIsInternallyConsistent() {
    ChartResponse chart = calculator.calculate(null, LocalDateTime.of(1990, 8, 15, 6, 30),
        "New Delhi", 28.6139, 77.209, "Asia/Kolkata", Ayanamsa.LAHIRI);

    assertEquals(9, chart.planets().size());
      var rahu = chart.planets().get(7);
      assertEquals(9, chart.dashas().size());
      assertEquals(8, chart.yoginiDashas().size());
      assertEquals(12, chart.charaDashas().size());
      assertEquals(9, chart.dashas().get(0).antardashas().get(0).pratyantardashas().size());
      assertEquals(8, chart.yoginiDashas().get(0).antardashas().get(0).pratyantardashas().size());
      assertEquals(12, chart.charaDashas().get(0).antardashas().get(0).pratyantardashas().size());
    var ketu = chart.planets().get(8);
    assertEquals("Rahu", rahu.name());
    assertEquals("Ketu", ketu.name());
    assertEquals(16, chart.planets().get(0).divisionalSigns().size());
    assertEquals(chart.planets().get(0).navamsaSignNumber(), chart.planets().get(0).divisionalSigns().get("D9"));
    assertEquals(180.0, AstroMath.norm(ketu.longitude() - rahu.longitude()), 1e-6);
    assertTrue(rahu.retrograde() && ketu.retrograde());
    assertEquals(1, chart.ascendant().house());
    assertEquals("+05:30", chart.birthDetails().utcOffset());
    assertEquals("1990-08-15T01:00Z", chart.birthDetails().utcTime());
    chart.planets().forEach(p -> assertTrue(p.house() >= 1 && p.house() <= 12));
  }

  @Test
  void charaCapricornAntardashasFollowKnRaoSequence() {
    ChartResponse chart = calculator.calculate("Test", LocalDateTime.of(1997, 11, 23, 17, 13),
        "Asansol", 23.6833, 86.9833, "Asia/Kolkata", Ayanamsa.LAHIRI);

    var capricorn = chart.charaDashas().stream().filter(d -> d.lord().equals("Capricorn")).findFirst().orElseThrow();

    assertEquals("2020-11-23", capricorn.start());
    assertEquals("2030-11-24", capricorn.end());
    assertEquals(java.util.List.of("Sagittarius", "Scorpio", "Libra", "Virgo", "Leo", "Cancer",
      "Gemini", "Taurus", "Aries", "Pisces", "Aquarius", "Capricorn"),
      capricorn.antardashas().stream().map(d -> d.lord()).toList());
    assertEquals("2020-11-23", capricorn.antardashas().get(0).start());
    assertEquals("2030-11-24", capricorn.antardashas().get(11).end());
  }

  @Test
  void annualChartsRepeatTheNatalSunAndTithiPhase() {
    LocalDateTime local = LocalDateTime.of(1997, 11, 23, 17, 13);
    BirthRequest birth = new BirthRequest("Test", local.toLocalDate(), local.toLocalTime(), "Asansol",
      23.6833, 86.9833, "Asia/Kolkata", Ayanamsa.LAHIRI, null, false, null, false);
    ChartResponse natal = calculator.calculate("Test", local, "Asansol", 23.6833, 86.9833,
        "Asia/Kolkata", Ayanamsa.LAHIRI);
    var returns = calculator.calculateAnnualCharts(birth, 2026);

    double natalSun = natal.planets().stream().filter(p -> p.name().equals("Sun")).findFirst().orElseThrow().longitude();
    double natalMoon = natal.planets().stream().filter(p -> p.name().equals("Moon")).findFirst().orElseThrow().longitude();
    double returnSun = returns.varshaphal().planets().stream().filter(p -> p.name().equals("Sun")).findFirst().orElseThrow().longitude();
    double returnMoon = returns.tithiPravesh().planets().stream().filter(p -> p.name().equals("Moon")).findFirst().orElseThrow().longitude();
    double returnTithiSun = returns.tithiPravesh().planets().stream().filter(p -> p.name().equals("Sun")).findFirst().orElseThrow().longitude();

    assertTrue(Math.abs(AstroMath.norm(returnSun - natalSun + 180) - 180) < 0.0001);
    assertTrue(Math.abs(AstroMath.norm((returnMoon - returnTithiSun) - (natalMoon - natalSun) + 180) - 180) < 0.0001);
    assertEquals(2026, returns.year());
  }

  @Test
  void includesCurrentTransitsAgainstNatalAscendant() {
    ChartResponse chart = calculator.calculate(null, LocalDateTime.of(1990, 8, 15, 6, 30),
        "New Delhi", 28.6139, 77.209, "Asia/Kolkata", Ayanamsa.LAHIRI);

    assertEquals(9, chart.transits().planets().size());
    assertEquals("Saturn", chart.transits().planets().get(6).name());
    chart.transits().planets().forEach(p -> assertTrue(p.house() >= 1 && p.house() <= 12));
    assertTrue(chart.transits().asOf().endsWith("Z"));
  }

  @Test
  void calculatesTransitsAtNoonOnTheSelectedBirthLocationDate() {
    ChartResponse chart = calculator.calculate(null, LocalDateTime.of(1990, 8, 15, 6, 30),
        "New Delhi", 28.6139, 77.209, "Asia/Kolkata", Ayanamsa.LAHIRI, LocalDate.of(2024, 1, 1));

    assertEquals("2024-01-01T06:30:00Z", chart.transits().asOf());
    assertEquals(9, chart.transits().planets().size());
  }

  @Test
  void supportsTrueNodeAndAdditionalAyanamsas() {
    ChartResponse mean = calculator.calculate("Test", LocalDateTime.of(2000, 1, 1, 12, 0),
        "Greenwich", 51.4769, 0.0, "UTC", Ayanamsa.TRUE_CHITRA, null, false, null);
    ChartResponse trueNode = calculator.calculate("Test", LocalDateTime.of(2000, 1, 1, 12, 0),
        "Greenwich", 51.4769, 0.0, "UTC", Ayanamsa.YUKTESHWAR, null, true, null);

    assertEquals(Ayanamsa.TRUE_CHITRA, mean.birthDetails().ayanamsa());
    assertEquals(Ayanamsa.YUKTESHWAR, trueNode.birthDetails().ayanamsa());
    assertTrue(trueNode.birthDetails().trueNode());
    assertTrue(Math.abs(mean.planets().get(7).longitude() - trueNode.planets().get(7).longitude()) > 0.01);
  }

  @Test
  void rejectsLocalTimeSkippedByDaylightSaving() {
    var e = assertThrows(IllegalArgumentException.class, () -> calculator.calculate(null,
        LocalDateTime.of(2024, 3, 10, 2, 30), "New York", 40.71, -74.0, "America/New_York", Ayanamsa.LAHIRI));
    assertTrue(e.getMessage().contains("does not exist"));
  }

  @Test
  void rejectsOutOfRangeYear() {
    assertThrows(IllegalArgumentException.class, () -> calculator.calculate(null,
        LocalDateTime.of(1700, 1, 1, 12, 0), "Anywhere", 0, 0, "UTC", Ayanamsa.LAHIRI));
  }
}
