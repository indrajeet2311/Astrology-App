package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Aspect;
import com.celestia.astro.model.ChartResponse.Position;
import com.celestia.astro.model.ChartResponse.Yoga;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChartInsightsTest {
  private static final Position ASC_ARIES = body("Ascendant", 1, 1, null);

  private static Position body(String name, int signNumber, int house, String dignity) {
    return new Position(name, (signNumber - 1) * 30 + 10, "S" + signNumber, signNumber, house, 10, "N", 1, false,
      signNumber, dignity, false, true, java.util.Map.of("D1", signNumber, "D9", signNumber));
  }

  /** All nine bodies parked in Aries unless overridden. */
  private static List<Position> planets(Position... overrides) {
    List<Position> list = new ArrayList<>();
    for (String n : List.of("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu")) {
      Position replacement = null;
      for (Position o : overrides) if (o.name().equals(n)) replacement = o;
      list.add(replacement != null ? replacement : body(n, 1, 1, null));
    }
    return list;
  }

  private static boolean has(List<Yoga> yogas, String name) {
    return yogas.stream().anyMatch(y -> y.name().startsWith(name));
  }

  @Test
  void aspectsAreSeventhPlusSpecialAspects() {
    List<Position> chart = planets(body("Mars", 1, 1, null), body("Jupiter", 5, 5, null), body("Saturn", 3, 3, null));
    List<Aspect> aspects = ChartInsights.aspects(chart);

    assertEquals(List.of(4, 7, 8), find(aspects, "Mars").houses());
    assertEquals(List.of(1, 9, 11), find(aspects, "Jupiter").houses());
    assertEquals(List.of(5, 9, 12), find(aspects, "Saturn").houses());
    assertEquals(List.of(7), find(aspects, "Sun").houses());
    assertEquals(List.of(7), find(aspects, "Rahu").houses());
  }

  @Test
  void aspectTargetsListPlanetsInAspectedHouses() {
    List<Position> chart = planets(body("Moon", 7, 7, null));
    assertEquals(List.of("Moon"), find(ChartInsights.aspects(chart), "Sun").planets());
  }

  @Test
  void gajaKesariWhenJupiterIsKendraFromMoon() {
    List<Position> chart = planets(body("Moon", 1, 1, null), body("Jupiter", 4, 4, null));
    assertTrue(has(ChartInsights.yogas(ASC_ARIES, chart), "Gaja Kesari"));
    assertTrue(!has(ChartInsights.yogas(ASC_ARIES, planets(body("Moon", 1, 1, null), body("Jupiter", 3, 3, null))),
        "Gaja Kesari"));
  }

  @Test
  void mahapurushaNeedsDignityAndKendra() {
    List<Position> yes = planets(body("Mars", 10, 10, "EXALTED"));
    List<Position> noKendra = planets(body("Mars", 8, 8, "OWN"));
    assertTrue(has(ChartInsights.yogas(ASC_ARIES, yes), "Ruchaka"));
    assertTrue(!has(ChartInsights.yogas(ASC_ARIES, noKendra), "Ruchaka"));
  }

  @Test
  void rajaYogaWhenKendraAndTrikonaLordsConjoin() {
    // Aries Lagna: 4th lord Moon, 5th lord Sun. Put both in Gemini.
    List<Position> chart = planets(body("Moon", 3, 3, null), body("Sun", 3, 3, null));
    assertTrue(has(ChartInsights.yogas(ASC_ARIES, chart), "Raja Yoga"));
  }

  @Test
  void mangalDoshaFromLagnaHouses() {
    assertTrue(has(ChartInsights.yogas(ASC_ARIES, planets(body("Mars", 7, 7, null))), "Mangal Dosha"));
    assertTrue(!has(ChartInsights.yogas(ASC_ARIES, planets(body("Mars", 3, 3, null))), "Mangal Dosha"));
  }

  @Test
  void sadeSatiCoversTwelfthFirstAndSecondFromMoonSign() {
    assertEquals("Rising", ChartInsights.sadeSati(5, 4).phase());
    assertEquals("Peak", ChartInsights.sadeSati(5, 5).phase());
    assertEquals("Setting", ChartInsights.sadeSati(5, 6).phase());
    assertTrue(!ChartInsights.sadeSati(5, 7).active());
    // Wraps across Pisces -> Aries.
    assertEquals("Rising", ChartInsights.sadeSati(1, 12).phase());
    assertEquals("Setting", ChartInsights.sadeSati(12, 1).phase());
  }

  private static Aspect find(List<Aspect> aspects, String planet) {
    return aspects.stream().filter(a -> a.planet().equals(planet)).findFirst().orElseThrow();
  }
}
