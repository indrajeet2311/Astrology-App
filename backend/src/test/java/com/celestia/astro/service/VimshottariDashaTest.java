package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class VimshottariDashaTest {
  private static final Instant BIRTH = Instant.parse("2000-01-01T00:00:00Z");

  @Test
  void moonAtStartOfAshwiniBeginsKetuDashaAtBirth() {
    List<Dasha> d = VimshottariDasha.compute(0.0, BIRTH, ZoneOffset.UTC);

    assertEquals(9, d.size());
    assertEquals("Ketu", d.get(0).lord());
    assertEquals("2000-01-01", d.get(0).start());
    assertEquals("Venus", d.get(1).lord());
    assertEquals("Mercury", d.get(8).lord());
  }

  @Test
  void moonHalfwayThroughAshwiniLeavesHalfOfKetuDasha() {
    List<Dasha> d = VimshottariDasha.compute(360.0 / 27.0 / 2.0, BIRTH, ZoneOffset.UTC);

    // Ketu lasts 7 years, so 3.5 years have already elapsed at birth.
    long daysBefore = ChronoUnit.DAYS.between(LocalDate.parse(d.get(0).start()), LocalDate.parse("2000-01-01"));
    assertEquals(3.5 * 365.25, daysBefore, 1.0);
  }

  @Test
  void nakshatraLordsRepeatEveryNineNakshatras() {
    // Magha (index 9) is ruled by Ketu again; Revati (26) by Mercury.
    assertEquals("Ketu", VimshottariDasha.compute(9 * 360.0 / 27.0 + 0.1, BIRTH, ZoneOffset.UTC).get(0).lord());
    assertEquals("Mercury", VimshottariDasha.compute(359.0, BIRTH, ZoneOffset.UTC).get(0).lord());
  }

  @Test
  void periodsAreContiguousAndSpanOneHundredTwentyYears() {
    List<Dasha> d = VimshottariDasha.compute(123.4, BIRTH, ZoneOffset.UTC);

    for (int i = 1; i < d.size(); i++) assertEquals(d.get(i - 1).end(), d.get(i).start());
    long days = ChronoUnit.DAYS.between(LocalDate.parse(d.get(0).start()), LocalDate.parse(d.get(8).end()));
    assertEquals(120 * 365.25, days, 2.0);

    for (Dasha maha : d) {
      assertEquals(9, maha.antardashas().size());
      assertEquals(maha.lord(), maha.antardashas().get(0).lord());
      assertEquals(maha.start(), maha.antardashas().get(0).start());
      assertEquals(maha.end(), maha.antardashas().get(8).end());
    }
  }
}
