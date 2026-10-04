package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Panchang;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PanchangCalculatorTest {
  private static final LocalDate SUNDAY = LocalDate.of(2024, 1, 7);

  private static Panchang at(double sun, double moon) {
    return PanchangCalculator.calculate(sun, moon, SUNDAY);
  }

  @Test
  void tithiAndPakshaFollowSunMoonElongation() {
    assertEquals("Pratipada", at(100, 100).tithi());
    assertEquals("Shukla", at(100, 100).paksha());
    assertEquals("Ashtami", at(100, 100 + 7 * 12 + 1).tithi());
    assertEquals(15, at(100, 100 + 14 * 12 + 1).tithiNumber());
    assertEquals("Purnima", at(100, 100 + 14 * 12 + 1).tithi());
    assertEquals(16, at(100, 100 + 180).tithiNumber());
    assertEquals("Krishna", at(100, 100 + 180).paksha());
    assertEquals("Pratipada", at(100, 100 + 180).tithi());
    assertEquals("Amavasya", at(100, 100 + 359).tithi());
  }

  @Test
  void elongationWrapsAcrossZero() {
    // Moon at 5, Sun at 355 -> elongation 10 degrees, still the first tithi.
    assertEquals(1, at(355, 5).tithiNumber());
  }

  @Test
  void karanaSequenceMatchesLunarMonthLayout() {
    assertEquals("Kimstughna", PanchangCalculator.karana(0));
    assertEquals("Bava", PanchangCalculator.karana(1));
    assertEquals("Vishti", PanchangCalculator.karana(7));
    assertEquals("Bava", PanchangCalculator.karana(8));
    assertEquals("Vishti", PanchangCalculator.karana(56));
    assertEquals("Shakuni", PanchangCalculator.karana(57));
    assertEquals("Chatushpada", PanchangCalculator.karana(58));
    assertEquals("Naga", PanchangCalculator.karana(59));
  }

  @Test
  void yogaFromSumOfLongitudes() {
    assertEquals("Vishkambha", at(0, 0).yoga());
    assertEquals("Priti", at(10, 4).yoga());      // 14 deg -> second 13.33 deg slice
    assertEquals("Vaidhriti", at(200, 159).yoga());
  }

  @Test
  void varaAndLordFromWeekday() {
    assertEquals("Sunday", at(0, 0).vara());
    assertEquals("Sun", at(0, 0).varaLord());
    Panchang monday = PanchangCalculator.calculate(0, 0, LocalDate.of(2024, 1, 8));
    assertEquals("Monday", monday.vara());
    assertEquals("Moon", monday.varaLord());
    assertEquals("Saturn", PanchangCalculator.calculate(0, 0, LocalDate.of(2024, 1, 6)).varaLord());
  }
}
