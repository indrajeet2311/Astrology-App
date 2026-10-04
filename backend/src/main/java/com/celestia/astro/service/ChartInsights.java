package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Aspect;
import com.celestia.astro.model.ChartResponse.Position;
import com.celestia.astro.model.ChartResponse.SadeSati;
import com.celestia.astro.model.ChartResponse.Yoga;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Graha drishti (planetary aspects) and a small set of well-defined yogas, all on whole-sign houses. */
public final class ChartInsights {
  /** Extra aspects beyond the 7th house; Rahu and Ketu are given the 7th only. */
  private static final Map<String, int[]> SPECIAL_ASPECTS = Map.of(
      "Mars", new int[] {4, 8}, "Jupiter", new int[] {5, 9}, "Saturn", new int[] {3, 10});
  private static final Map<String, String> MAHAPURUSHA = Map.of(
      "Mars", "Ruchaka", "Mercury", "Bhadra", "Jupiter", "Hamsa", "Venus", "Malavya", "Saturn", "Shasha");

  private ChartInsights() {}

  /** House reached by an n-th house aspect from {@code house} (1-12). */
  static int aspectedHouse(int house, int n) {
    return (house - 1 + n - 1) % 12 + 1;
  }

  public static List<Aspect> aspects(List<Position> planets) {
    List<Aspect> result = new ArrayList<>();
    for (Position p : planets) {
      List<Integer> houses = new ArrayList<>();
      houses.add(aspectedHouse(p.house(), 7));
      for (int n : SPECIAL_ASPECTS.getOrDefault(p.name(), new int[0])) houses.add(aspectedHouse(p.house(), n));
      houses.sort(null);
      List<String> targets = planets.stream()
          .filter(o -> !o.name().equals(p.name()) && houses.contains(o.house()))
          .map(Position::name).toList();
      result.add(new Aspect(p.name(), houses, targets));
    }
    return result;
  }

  public static List<Yoga> yogas(Position ascendant, List<Position> planets) {
    List<Yoga> yogas = new ArrayList<>();
    Position sun = find(planets, "Sun");
    Position moon = find(planets, "Moon");
    Position mars = find(planets, "Mars");
    Position mercury = find(planets, "Mercury");
    Position jupiter = find(planets, "Jupiter");

    if (isKendra(Math.floorMod(jupiter.house() - moon.house(), 12) + 1)) {
      yogas.add(new Yoga("Gaja Kesari", "Jupiter is in a kendra (1st, 4th, 7th or 10th) from the Moon.",
          List.of("Jupiter", "Moon")));
    }
    if (sun.signNumber() == mercury.signNumber()) {
      yogas.add(new Yoga("Budhaditya", "The Sun and Mercury share a sign.", List.of("Sun", "Mercury")));
    }
    if (moon.signNumber() == mars.signNumber()) {
      yogas.add(new Yoga("Chandra-Mangal", "The Moon and Mars share a sign.", List.of("Moon", "Mars")));
    }
    for (Position p : planets) {
      String name = MAHAPURUSHA.get(p.name());
      String dignity = p.dignity();
      if (name != null && isKendra(p.house()) && ("OWN".equals(dignity) || "EXALTED".equals(dignity))) {
        yogas.add(new Yoga(name + " (Pancha Mahapurusha)",
            p.name() + " is in its own or exalted sign and in a kendra from the Ascendant.", List.of(p.name())));
      }
    }
    Set<String> seen = new HashSet<>();
    int[][] rajaPairs = {{4, 5}, {4, 9}, {7, 5}, {7, 9}, {10, 5}, {10, 9}, {1, 4}, {1, 5}, {1, 7}, {1, 9}, {1, 10}};
    for (int[] pair : rajaPairs) {
      String name = pair[0] == 10 && pair[1] == 9 ? "Dharma-Karmadhipati Yoga" : "Raja Yoga";
      pairYoga(yogas, seen, ascendant, planets, pair[0], pair[1], name);
    }
    int[][] dhanaPairs = {{2, 11}, {2, 5}, {2, 9}, {2, 10}, {5, 11}, {9, 11}, {1, 2}, {1, 11}, {5, 9}};
    for (int[] pair : dhanaPairs) {
      pairYoga(yogas, seen, ascendant, planets, pair[0], pair[1], "Dhana Yoga");
    }
    int[] dusthana = {6, 8, 12};
    for (int h : dusthana) {
      String lord = lordOfHouse(ascendant, h);
      Position p = find(planets, lord);
      if (List.of(6, 8, 12).contains(p.house()) && seen.add("vip" + lord)) {
        yogas.add(new Yoga("Viparita Raja Yoga", "The " + ordinal(h) + " lord (" + lord + ") sits in the "
            + ordinal(p.house()) + " house, a dusthana.", List.of(lord)));
      }
    }
    String ninth = lordOfHouse(ascendant, 9);
    String lagnaLord = lordOfHouse(ascendant, 1);
    Position ninthPos = find(planets, ninth);
    if (isStrong(ninthPos) && isKendra(ninthPos.house()) && isStrong(find(planets, lagnaLord))) {
      yogas.add(new Yoga("Lakshmi Yoga", "The 9th lord (" + ninth + ") is strong in a kendra and the Ascendant "
          + "lord (" + lagnaLord + ") is in its own or exalted sign.", List.of(ninth, lagnaLord)));
    }
    for (Position p : planets) {
      if (p.name().equals("Jupiter") && (p.house() == 2 || p.house() == 11)) {
        yogas.add(new Yoga("Dhana Yoga", "Jupiter, the planet of wealth, occupies the " + ordinal(p.house())
            + " house.", List.of("Jupiter")));
      }
    }
    if (List.of(1, 2, 4, 7, 8, 12).contains(mars.house())) {
      yogas.add(new Yoga("Mangal Dosha", "Mars is in the " + ordinal(mars.house()) + " house from the Ascendant.",
          List.of("Mars")));
    }
    return yogas;
  }

  /** Saturn in the 12th, 1st or 2nd sign from the natal Moon sign (sign numbers 1-12). */
  public static SadeSati sadeSati(int moonSign, int saturnSign) {
    return switch (Math.floorMod(saturnSign - moonSign, 12)) {
      case 11 -> new SadeSati(true, "Rising", "Saturn is in the sign before your Moon sign (first phase).");
      case 0 -> new SadeSati(true, "Peak", "Saturn is transiting your Moon sign (middle phase).");
      case 1 -> new SadeSati(true, "Setting", "Saturn is in the sign after your Moon sign (last phase).");
      default -> new SadeSati(false, null, "Saturn is not within one sign of your Moon sign.");
    };
  }

  private static boolean isStrong(Position p) {
    return "OWN".equals(p.dignity()) || "EXALTED".equals(p.dignity());
  }

  /** Reports a conjunction or sign exchange between the lords of two houses. */
  private static void pairYoga(List<Yoga> yogas, Set<String> seen, Position ascendant, List<Position> planets,
                               int h1, int h2, String name) {
    String l1 = lordOfHouse(ascendant, h1);
    String l2 = lordOfHouse(ascendant, h2);
    if (l1.equals(l2)) return;
    Position a = find(planets, l1);
    Position b = find(planets, l2);
    String key = name + (l1.compareTo(l2) < 0 ? l1 + "/" + l2 : l2 + "/" + l1);
    String lords = "(" + l1 + " and " + l2 + ")";
    if (a.signNumber() == b.signNumber()) {
      if (seen.add(key + "c")) {
        yogas.add(new Yoga(name, "The lords of the " + ordinal(h1) + " and " + ordinal(h2) + " houses " + lords
            + " share a sign.", List.of(l1, l2)));
      }
    } else if (a.house() == h2 && b.house() == h1 && seen.add(key + "e")) {
      yogas.add(new Yoga(name + " (Parivartana)", "The lords of the " + ordinal(h1) + " and " + ordinal(h2)
          + " houses " + lords + " exchange signs.", List.of(l1, l2)));
    }
  }

  private static boolean isKendra(int house) {
    return house == 1 || house == 4 || house == 7 || house == 10;
  }

  private static String lordOfHouse(Position ascendant, int house) {
    return Dignity.signLord((ascendant.signNumber() - 1 + house - 1) % 12);
  }

  private static Position find(List<Position> planets, String name) {
    return planets.stream().filter(p -> p.name().equals(name)).findFirst().orElseThrow();
  }

  private static String ordinal(int n) {
    return switch (n) {
      case 1 -> "1st";
      case 2 -> "2nd";
      case 3 -> "3rd";
      default -> n + "th";
    };
  }
}
