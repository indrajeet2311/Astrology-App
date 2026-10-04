package com.celestia.astro.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DignityTest {
  @Test
  void exaltationDebilitationAndOwnSigns() {
    assertEquals("EXALTED", Dignity.dignity("Sun", 0));
    assertEquals("DEBILITATED", Dignity.dignity("Sun", 6));
    assertEquals("OWN", Dignity.dignity("Sun", 4));
    assertEquals("EXALTED", Dignity.dignity("Moon", 1));
    assertEquals("DEBILITATED", Dignity.dignity("Moon", 7));
    assertEquals("EXALTED", Dignity.dignity("Saturn", 6));
    assertEquals("OWN", Dignity.dignity("Saturn", 10));
    assertEquals("DEBILITATED", Dignity.dignity("Venus", 5));
    assertEquals("EXALTED", Dignity.dignity("Mercury", 5));
    assertNull(Dignity.dignity("Jupiter", 1));
  }

  @Test
  void nodesHaveNoClassicalDignity() {
    assertNull(Dignity.dignity("Rahu", 0));
    assertNull(Dignity.dignity("Ketu", 6));
  }

  @Test
  void combustionUsesOrbAndWrapsAroundZero() {
    assertTrue(Dignity.isCombust("Mars", 100, false, 110));
    assertFalse(Dignity.isCombust("Mars", 100, false, 120));
    assertTrue(Dignity.isCombust("Venus", 355, false, 5));
    assertTrue(Dignity.isCombust("Venus", 100, false, 109));
    assertFalse(Dignity.isCombust("Venus", 100, true, 109));
    assertFalse(Dignity.isCombust("Sun", 100, false, 100));
    assertFalse(Dignity.isCombust("Rahu", 100, false, 100));
  }
}
