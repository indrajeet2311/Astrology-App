package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Panchang;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.Locale;

/** Tithi, vara, yoga and karana from sidereal Sun and Moon longitudes (nakshatra is already on the Moon). */
public final class PanchangCalculator {
  private static final String[] TITHIS = {
      "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami",
      "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"};
  private static final String[] YOGAS = {
      "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda", "Sukarma", "Dhriti", "Shula", "Ganda",
      "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
      "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"};
  private static final String[] MOVABLE_KARANAS = {
      "Bava", "Balava", "Kaulava", "Taitila", "Gara", "Vanija", "Vishti"};
  private static final String[] VARA_LORDS = {"Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Sun"};

  private PanchangCalculator() {}

  /** The vara uses the civil date; the Vedic day properly starts at sunrise. */
  public static Panchang calculate(double sunLongitude, double moonLongitude, LocalDate localDate) {
    double elongation = AstroMath.norm(moonLongitude - sunLongitude);
    int tithi = Math.min(29, (int) (elongation / 12.0)) + 1;
    boolean shukla = tithi <= 15;
    String tithiName = tithi == 15 ? "Purnima" : tithi == 30 ? "Amavasya" : TITHIS[(tithi - 1) % 15];

    int yoga = Math.min(26, (int) (AstroMath.norm(sunLongitude + moonLongitude) / (360.0 / 27.0)));
    DayOfWeek day = localDate.getDayOfWeek();
    return new Panchang(tithi, tithiName, shukla ? "Shukla" : "Krishna", day.getDisplayName(TextStyle.FULL, Locale.ENGLISH),
        VARA_LORDS[day.ordinal()], YOGAS[yoga], karana(Math.min(59, (int) (elongation / 6.0))));
  }

  /** Karana index 0-59 over a lunar month: one fixed, then seven movable repeated eight times, then three fixed. */
  static String karana(int index) {
    return switch (index) {
      case 0 -> "Kimstughna";
      case 57 -> "Shakuni";
      case 58 -> "Chatushpada";
      case 59 -> "Naga";
      default -> MOVABLE_KARANAS[(index - 1) % 7];
    };
  }
}
