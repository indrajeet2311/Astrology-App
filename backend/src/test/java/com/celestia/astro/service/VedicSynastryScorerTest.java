package com.celestia.astro.service;

import com.celestia.astro.model.Ayanamsa;
import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.ChartResponse.Position;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class VedicSynastryScorerTest {
  private final SwissEphemerisCalculator calculator = new SwissEphemerisCalculator();
  private final KundliMatcher matcher = new KundliMatcher();

  @Test
  void keepsAshtakootaSeparateAndConnectionScorePreciselyWeighted() {
    ChartResponse bride = calculator.calculate("Bride", LocalDateTime.of(1990, 8, 15, 6, 30),
        "New Delhi", 28.6139, 77.209, "Asia/Kolkata", Ayanamsa.LAHIRI);
    ChartResponse groom = calculator.calculate("Groom", LocalDateTime.of(1988, 3, 4, 14, 15),
        "Mumbai", 19.076, 72.8777, "Asia/Kolkata", Ayanamsa.LAHIRI);

    var moonOnly = matcher.match(bride.planets().stream().filter(p -> p.name().equals("Moon")).findFirst().orElseThrow().longitude(),
        groom.planets().stream().filter(p -> p.name().equals("Moon")).findFirst().orElseThrow().longitude());
    var combined = matcher.match(bride, groom);
    var compatibility = combined.compatibility();

    assertEquals(36, combined.maxScore());
    assertEquals(moonOnly.score(), combined.score());
    assertEquals(moonOnly.kootas(), combined.kootas());
    assertEquals(50, compatibility.otherVedic().maxPoints());
    assertEquals(50, compatibility.otherVedic().rules().stream().mapToDouble(r -> r.maxPoints()).sum());
    assertEquals(compatibility.otherVedic().points(), compatibility.otherVedic().rules().stream().mapToDouble(r -> r.points()).sum(), 0.0001);
    assertTrue(compatibility.otherVedic().points() >= 0 && compatibility.otherVedic().points() <= 50);

    assertEquals(12, compatibility.connectionSets().size());
    assertEquals(5, compatibility.chanceOfMarriage().maxPoints());
    long matchingSets = compatibility.connectionSets().stream().filter(row -> row.matched()).count();
    assertEquals(matchingSets * (5.0 / 12.0), compatibility.chanceOfMarriage().points(), 0.0001);
    assertEquals(compatibility.chanceOfMarriage().points(),
        compatibility.chanceOfMarriage().rules().stream().mapToDouble(r -> r.points()).sum(), 0.0001);
    compatibility.chanceOfMarriage().rules().stream().skip(1)
        .forEach(indicator -> assertEquals(0, indicator.maxPoints()));
    assertTrue(compatibility.connectionSets().stream().allMatch(row -> row.overlap().stream()
        .allMatch(value -> row.groom().contains(value) && row.bride().contains(value))));
    assertTrue(compatibility.notes().stream().anyMatch(note -> note.contains("not added to Other Vedic")));

        Position groomDk = charaDk(groom), brideDk = charaDk(bride);
        assertEquals(isSupportiveDistance(groomDk.signNumber(), signAtHouse(bride.ascendant().signNumber(), 7)),
                compatibility.marriageSynastry().stream().anyMatch(rule -> rule.name().equals("Groom DK " + groomDk.name() + " → Bride 7th house")));
        assertEquals(isSupportiveDistance(brideDk.signNumber(), signAtHouse(groom.ascendant().signNumber(), 7)),
                compatibility.marriageSynastry().stream().anyMatch(rule -> rule.name().equals("Bride DK " + brideDk.name() + " → Groom 7th house")));
  }

    private static Position charaDk(ChartResponse chart) {
        List<String> visible = List.of("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn");
        return chart.planets().stream().filter(planet -> visible.contains(planet.name()))
                .sorted((a, b) -> Double.compare(b.degreeInSign(), a.degreeInSign())).toList().get(6);
    }

    private static boolean isSupportiveDistance(int fromSign, int targetSign) {
        int distance = Math.floorMod(targetSign - fromSign, 12) + 1;
        return Set.of(1, 5, 7, 9).contains(distance);
    }

    private static int signAtHouse(int ascendantSign, int house) {
        return Math.floorMod(ascendantSign - 1 + house - 1, 12) + 1;
    }
}