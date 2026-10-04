package com.celestia.astro.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KundliMatcherTest {
  private final KundliMatcher matcher = new KundliMatcher();

  @Test
  void returnsAllEightKootasAndKeepsScoreWithinThirtySix() {
    var result = matcher.match(40.0, 120.0);

    assertEquals(8, result.kootas().size());
    assertEquals(36.0, result.maxScore());
    assertTrue(result.score() >= 0 && result.score() <= result.maxScore());
    assertEquals(result.score(), result.kootas().stream().mapToDouble(k -> k.score()).sum());
  }

  @Test
  void sameAshwiniMoonSignsScoreExpectedKootas() {
    var result = matcher.match(0.0, 0.0);

    assertEquals("Aries", result.brideMoonSign());
    assertEquals("Aries", result.groomMoonSign());
    assertEquals(25.0, result.score());
    assertEquals(0.0, result.kootas().get(2).score());
    assertEquals(0.0, result.kootas().get(7).score());
    assertTrue(result.notes().stream().anyMatch(note -> note.contains("Nadi Dosha")));
  }

  @Test
  void varnaRuleIsDirectional() {
    var higherGroom = matcher.match(60.0, 90.0);
    var higherBride = matcher.match(90.0, 60.0);

    assertEquals(1.0, higherGroom.kootas().get(0).score());
    assertEquals(0.0, higherBride.kootas().get(0).score());
  }
}