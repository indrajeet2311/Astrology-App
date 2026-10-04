package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Position;
import com.celestia.astro.model.ChartResponse.Yoga;
import com.celestia.astro.model.KundliMatchResponse.Manglik;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DoshasTest {
  private static final Position ASC = body("Ascendant", 1, null);

  /** House equals sign number because the Ascendant is Aries. */
  private static Position body(String name, int sign, String dignity) {
    return new Position(name, (sign - 1) * 30 + 10, "S" + sign, sign, sign, 10, "N", 1, false, sign, dignity, false,
        false, Map.of("D1", sign, "D9", sign));
  }

  private static List<Position> chart(Position... overrides) {
    List<Position> list = new ArrayList<>();
    String[] names = {"Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"};
    for (String n : names) {
      Position pick = null;
      for (Position o : overrides) if (o.name().equals(n)) pick = o;
      list.add(pick != null ? pick : body(n, 6, null));
    }
    return list;
  }

  private static boolean has(List<Yoga> yogas, String prefix) {
    return yogas.stream().anyMatch(y -> y.name().startsWith(prefix));
  }

  private static List<Yoga> run(Position... overrides) {
    List<Yoga> yogas = new ArrayList<>();
    Doshas.add(yogas, ASC, chart(overrides));
    return yogas;
  }

  @Test
  void kaalSarpWhenAllPlanetsLieBetweenRahuAndKetu() {
    List<Yoga> yogas = run(body("Rahu", 1, null), body("Ketu", 7, null), body("Sun", 2, null), body("Moon", 3, null),
        body("Mars", 4, null), body("Mercury", 5, null), body("Jupiter", 6, null), body("Venus", 3, null),
        body("Saturn", 2, null));
    assertTrue(has(yogas, "Kaal Sarp"));
    assertFalse(has(run(body("Rahu", 1, null), body("Ketu", 7, null), body("Sun", 9, null)), "Kaal Sarp"));
  }

  @Test
  void parivartanaIsDetectedForSignExchange() {
    List<Yoga> yogas = run(body("Sun", 2, null), body("Venus", 5, null));
    assertTrue(has(yogas, "Maha Parivartana"));
  }

  @Test
  void neechaBhangaWhenDebilitationLordIsInKendra() {
    List<Yoga> yogas = run(body("Sun", 7, "DEBILITATED"), body("Venus", 4, null));
    assertTrue(has(yogas, "Neecha Bhanga Raja Yoga (Sun)"));
  }

  @Test
  void kemadrumaWhenMoonHasNoSupport() {
    List<Yoga> yogas = run(body("Moon", 2, null), body("Mars", 6, null), body("Mercury", 9, null),
        body("Jupiter", 12, null), body("Venus", 6, null), body("Saturn", 9, null));
    assertTrue(has(yogas, "Kemadruma Yoga"));
    assertFalse(has(run(body("Moon", 2, null), body("Mars", 5, null)), "Kemadruma Yoga"));
  }

  @Test
  void mangalDoshaIsCancelledByJupiterConjunction() {
    Manglik plain = Doshas.mangal(chart(body("Mars", 7, null), body("Jupiter", 2, null)));
    assertTrue(plain.present());
    assertEquals("High", plain.level());
    Manglik cancelled = Doshas.mangal(chart(body("Mars", 7, null), body("Jupiter", 7, null)));
    assertEquals("Cancelled", cancelled.level());
    assertTrue(cancelled.cancellations().stream().anyMatch(c -> c.contains("Jupiter")));
  }

  @Test
  void pitraDoshaWhenSunSharesSignWithRahu() {
    assertTrue(has(run(body("Sun", 3, null), body("Rahu", 3, null)), "Pitra Dosha"));
    assertFalse(has(run(body("Sun", 3, null), body("Rahu", 5, null), body("Ketu", 11, null)), "Pitra Dosha"));
  }
}
