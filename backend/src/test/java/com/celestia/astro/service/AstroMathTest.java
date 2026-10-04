package com.celestia.astro.service;

import org.junit.jupiter.api.Test;
import com.celestia.astro.model.HouseSystem;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AstroMathTest {
  @Test
  void signBoundariesAreHalfOpen() {
    assertEquals(0, AstroMath.sign(0));
    assertEquals(0, AstroMath.sign(29.999999));
    assertEquals(1, AstroMath.sign(30));
    assertEquals(11, AstroMath.sign(359.999999));
    assertEquals(0, AstroMath.sign(360));
  }

  @Test
  void normStaysBelow360EvenForTinyNegatives() {
    assertTrue(AstroMath.norm(-1e-15) < 360.0);
    assertEquals(0, AstroMath.sign(-1e-15));
    assertEquals(350, AstroMath.norm(-10), 1e-9);
    assertEquals(10, AstroMath.norm(730), 1e-9);
  }

  @Test
  void housesAreWholeSign() {
    assertEquals(1, AstroMath.house(10, 15));
    assertEquals(2, AstroMath.house(40, 15));
    assertEquals(12, AstroMath.house(340, 15));
  }

  @Test
  void equalHousesAreAnchoredToExactAscendantLongitude() {
    assertEquals(1, AstroMath.house(15, 15, HouseSystem.EQUAL));
    assertEquals(1, AstroMath.house(44.999, 15, HouseSystem.EQUAL));
    assertEquals(2, AstroMath.house(45, 15, HouseSystem.EQUAL));
    assertEquals(12, AstroMath.house(14.999, 15, HouseSystem.EQUAL));
    assertEquals(2, AstroMath.house(40, 15, HouseSystem.WHOLE_SIGN));
  }

  @Test
  void nakshatraAndPadaBoundaries() {
    assertEquals("Ashwini", AstroMath.nakshatra(0));
    assertEquals(1, AstroMath.pada(0));
    assertEquals(4, AstroMath.pada(13.3));
    assertEquals("Bharani", AstroMath.nakshatra(360.0 / 27.0));
    assertEquals(1, AstroMath.pada(360.0 / 27.0));
    assertEquals("Revati", AstroMath.nakshatra(359.999999));
    assertEquals(4, AstroMath.pada(359.999999));
    assertEquals("Ashwini", AstroMath.nakshatra(-1e-15));
  }

  @Test
  void navamsaFollowsMovableFixedDualRule() {
    assertEquals(0, AstroMath.navamsaSign(1));      // Aries (movable) starts at Aries
    assertEquals(8, AstroMath.navamsaSign(29));     // last Aries navamsa is Sagittarius
    assertEquals(9, AstroMath.navamsaSign(31));     // Taurus (fixed) starts at Capricorn
    assertEquals(6, AstroMath.navamsaSign(61));     // Gemini (dual) starts at Libra
    assertEquals(11, AstroMath.navamsaSign(359.999999));
    assertEquals(0, AstroMath.navamsaSign(-1e-15));
  }

  @Test
  void shodashvargaSupportsAllSixteenDivisions() {
    int[] divisions = {1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60};
    for (int division : divisions) {
      assertTrue(AstroMath.divisionalSign(359.999999, division) >= 0);
      assertTrue(AstroMath.divisionalSign(359.999999, division) < 12);
    }
    assertEquals(0, AstroMath.divisionalSign(0, 1));
    assertEquals(4, AstroMath.divisionalSign(0, 2));
    assertEquals(0, AstroMath.divisionalSign(0, 3));
    assertEquals(4, AstroMath.divisionalSign(10, 3));
    assertEquals(8, AstroMath.divisionalSign(20, 3));
    assertEquals(3, AstroMath.divisionalSign(8, 4));
    assertEquals(9, AstroMath.divisionalSign(29, 4));
    assertEquals(9, AstroMath.divisionalSign(30, 9));
    assertEquals(0, AstroMath.divisionalSign(0, 16));
    assertEquals(0, AstroMath.divisionalSign(0, 20));
    assertEquals(4, AstroMath.divisionalSign(0, 24));
    assertEquals(0, AstroMath.divisionalSign(0, 27));
    assertEquals(6, AstroMath.divisionalSign(29.999999, 30));
    assertEquals(10, AstroMath.divisionalSign(5, 30));
    assertEquals(0, AstroMath.divisionalSign(360, 60));
  }

  @Test
  void unsupportedDivisionIsRejected() {
    assertThrows(IllegalArgumentException.class, () -> AstroMath.divisionalSign(1, 5));
  }

  @Test
  void ketuIsOppositeRahu() {
    assertEquals(5, AstroMath.sign(AstroMath.norm(335 + 180)));
  }
}
