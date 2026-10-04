package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class YoginiDashaTest {
  private static final Instant BIRTH = Instant.parse("2000-01-01T00:00:00Z");

  @Test
  void ashwinisFirstYoginiIsBhramariAndCycleTotalsThirtySixYears() {
    List<Dasha> dashas = YoginiDasha.compute(0, BIRTH, ZoneOffset.UTC);

    assertEquals(8, dashas.size());
    assertEquals("Bhramari", dashas.get(0).lord());
    assertEquals("2000-01-01", dashas.get(0).start());
    assertEquals("Bhadrika", dashas.get(1).lord());
    assertEquals("Dhanya", dashas.get(7).lord());
    assertEquals(36 * 365.25, ChronoUnit.DAYS.between(LocalDate.parse(dashas.get(0).start()),
        LocalDate.parse(dashas.get(7).end())), 2.0);
  }

  @Test
  void periodsNestAntardashaAndPratyantardasha() {
    List<Dasha> dashas = YoginiDasha.compute(0, BIRTH, ZoneOffset.UTC);
    var antar = dashas.get(0).antardashas().get(0);

    assertEquals(8, dashas.get(0).antardashas().size());
    assertEquals(8, antar.pratyantardashas().size());
    assertEquals(antar.start(), antar.pratyantardashas().get(0).start());
    assertEquals(antar.end(), antar.pratyantardashas().get(7).end());
  }

  @Test
  void halfwayThroughAshwiniLeavesHalfOfBhramariPeriod() {
    double halfNakshatra = 360.0 / 27.0 / 2.0;
    List<Dasha> dashas = YoginiDasha.compute(halfNakshatra, BIRTH, ZoneOffset.UTC);
    long elapsedDays = ChronoUnit.DAYS.between(LocalDate.parse(dashas.get(0).start()), LocalDate.parse("2000-01-01"));
    assertEquals(2 * 365.25, elapsedDays, 1.0);
  }
}
