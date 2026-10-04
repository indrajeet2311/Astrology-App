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
    int[] kendras = {4, 7, 10};
    int[] trikonas = {5, 9};
    Set<String> seenRaja = new HashSet<>();
    for (int k : kendras) {
      for (int t : trikonas) {
        String kendraLord = lordOfHouse(ascendant, k);
        String trikonaLord = lordOfHouse(ascendant, t);
        Position a = find(planets, kendraLord);
        Position b = find(planets, trikonaLord);
        if (!kendraLord.equals(trikonaLord) && a.signNumber() == b.signNumber()
            && seenRaja.add(kendraLord + "/" + trikonaLord)) {
          yogas.add(new Yoga("Raja Yoga",
              "The lords of the " + ordinal(k) + " and " + ordinal(t) + " houses (" + kendraLord + " and "
                  + trikonaLord + ") share a sign.", List.of(kendraLord, trikonaLord)));
        }
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
