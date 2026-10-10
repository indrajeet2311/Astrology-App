package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Position;
import com.celestia.astro.model.ChartResponse.Yoga;
import com.celestia.astro.model.KundliMatchResponse.Manglik;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Classical doshas and cancellation yogas, judged on whole-sign houses. */
public final class Doshas {
  private static final List<String> SEVEN = List.of("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn");
  private static final String[] KAAL_SARP = {
      "Anant", "Kulik", "Vasuki", "Shankhpal", "Padma", "Mahapadma", "Takshak", "Karkotak", "Shankhachur",
      "Ghatak", "Vishdhar", "Sheshnag"};
  private static final Set<Integer> MANGAL_HOUSES = Set.of(1, 2, 4, 7, 8, 12);

  private Doshas() {}

  public static void add(List<Yoga> yogas, Position ascendant, List<Position> planets) {
    kemadruma(yogas, ascendant, planets);
    neechaBhanga(yogas, ascendant, planets);
    parivartana(yogas, planets);
    kaalSarp(yogas, planets);
    pitraDosha(yogas, ascendant, planets);
    Manglik mangal = mangal(planets);
    if (mangal.present() && !MANGAL_HOUSES.contains(find(planets, "Mars").house())) {
      yogas.add(new Yoga("Mangal Dosha (from Moon/Venus)", String.join(" ", mangal.factors()), List.of("Mars")));
    }
    if (mangal.present() && !mangal.cancellations().isEmpty()) {
      yogas.add(new Yoga("Mangal Dosha Bhanga (cancellation)", String.join(" ", mangal.cancellations()), List.of("Mars")));
    }
  }

  /** Mangal (Kuja) dosha from the Ascendant, Moon and Venus, with the usual cancellation conditions. */
  public static Manglik mangal(List<Position> planets) {
    Position mars = find(planets, "Mars");
    Position moon = find(planets, "Moon");
    Position venus = find(planets, "Venus");
    List<String> factors = new ArrayList<>();
    int sources = 0;
    boolean fromLagna = MANGAL_HOUSES.contains(mars.house());
    if (fromLagna) {
      sources++;
      factors.add("Mars is in the " + ordinal(mars.house()) + " house from the Ascendant.");
    }
    int fromMoon = relativeHouse(moon, mars);
    if (MANGAL_HOUSES.contains(fromMoon)) {
      sources++;
      factors.add("Mars is in the " + ordinal(fromMoon) + " house from the Moon.");
    }
    int fromVenus = relativeHouse(venus, mars);
    if (MANGAL_HOUSES.contains(fromVenus)) {
      sources++;
      factors.add("Mars is in the " + ordinal(fromVenus) + " house from Venus.");
    }
    if (sources == 0) return new Manglik(false, "None", List.of(), List.of());

    List<String> cancellations = new ArrayList<>();
    if ("OWN".equals(mars.dignity()) || "EXALTED".equals(mars.dignity())) {
      cancellations.add("Mars is in its own or exalted sign.");
    }
    boolean placementException = switch (mars.house()) {
      case 2 -> Set.of(3, 6).contains(mars.signNumber());
      case 4 -> Set.of(1, 8).contains(mars.signNumber());
      case 7 -> Set.of(4, 10).contains(mars.signNumber());
      case 8 -> Set.of(9, 12).contains(mars.signNumber());
      case 12 -> Set.of(2, 7).contains(mars.signNumber());
      default -> false;
    };
    if (placementException) cancellations.add("Mars sits in a sign where the dosha is classically cancelled for that house.");
    Position jupiter = find(planets, "Jupiter");
    int jupToMars = relativeHouse(jupiter, mars);
    if (jupToMars == 1 || jupToMars == 5 || jupToMars == 7 || jupToMars == 9) {
      cancellations.add("Jupiter conjoins or aspects Mars.");
    }
    if (mars.signNumber() == moon.signNumber()) cancellations.add("Mars is conjunct the Moon.");
    Position saturn = find(planets, "Saturn");
    if (MANGAL_HOUSES.contains(saturn.house()) && fromLagna) {
      cancellations.add("Saturn also occupies a Mangal house, which is traditionally said to offset the dosha.");
    }

    String level = !cancellations.isEmpty() ? "Cancelled" : sources >= 2 ? "High" : fromLagna ? "Medium" : "Low";
    return new Manglik(true, level, List.copyOf(factors), List.copyOf(cancellations));
  }

  private static void kemadruma(List<Yoga> yogas, Position ascendant, List<Position> planets) {
    Position moon = find(planets, "Moon");
    List<String> support = List.of("Mars", "Mercury", "Jupiter", "Venus", "Saturn");
    for (String name : support) {
      int rel = relativeHouse(moon, find(planets, name));
      if (rel == 1 || rel == 2 || rel == 12) return;
    }
    boolean cancelled = false;
    for (String name : support) {
      Position p = find(planets, name);
      if (isKendra(relativeHouse(moon, p)) || isKendra(relativeHouse(ascendant, p))) cancelled = true;
    }
    if (isKendra(relativeHouse(ascendant, moon))) cancelled = true;
    yogas.add(new Yoga(cancelled ? "Kemadruma (cancelled)" : "Kemadruma Yoga",
        "No planet other than the Sun and nodes lies in the 2nd or 12th from, or with, the Moon."
            + (cancelled ? " A planet or the Moon in a kendra cancels it." : ""), List.of("Moon")));
  }

  private static void neechaBhanga(List<Yoga> yogas, Position ascendant, List<Position> planets) {
    Position moon = find(planets, "Moon");
    for (String name : SEVEN) {
      Position p = find(planets, name);
      if (!"DEBILITATED".equals(p.dignity())) continue;
      List<String> reasons = new ArrayList<>();
      int debilitatedSign = p.signNumber() - 1;
      String signLord = Dignity.signLord(debilitatedSign);
      String exaltLord = Dignity.signLord((debilitatedSign + 6) % 12);
      for (String[] pair : new String[][] {{"lord of the debilitation sign", signLord}, {"lord of the exaltation sign", exaltLord}}) {
        Position lord = find(planets, pair[1]);
        if (isKendra(relativeHouse(ascendant, lord)) || isKendra(relativeHouse(moon, lord))) {
          reasons.add("The " + pair[0] + " (" + pair[1] + ") is in a kendra from the Ascendant or Moon.");
        }
      }
      if (isKendra(relativeHouse(ascendant, p)) || isKendra(relativeHouse(moon, p))) {
        reasons.add(name + " itself is in a kendra from the Ascendant or Moon.");
      }
      if (!reasons.isEmpty()) {
        yogas.add(new Yoga("Neecha Bhanga Raja Yoga (" + name + ")",
            name + " is debilitated, but the debilitation is cancelled. " + String.join(" ", reasons), List.of(name)));
      }
    }
  }

  private static void parivartana(List<Yoga> yogas, List<Position> planets) {
    for (int i = 0; i < SEVEN.size(); i++) {
      for (int j = i + 1; j < SEVEN.size(); j++) {
        Position a = find(planets, SEVEN.get(i));
        Position b = find(planets, SEVEN.get(j));
        if (!Dignity.signLord(a.signNumber() - 1).equals(b.name())) continue;
        if (!Dignity.signLord(b.signNumber() - 1).equals(a.name())) continue;
        boolean dainya = Set.of(6, 8, 12).contains(a.house()) || Set.of(6, 8, 12).contains(b.house());
        boolean khala = a.house() == 3 || b.house() == 3;
        String type = dainya ? "Dainya" : khala ? "Khala" : "Maha";
        yogas.add(new Yoga(type + " Parivartana Yoga",
            a.name() + " and " + b.name() + " exchange signs (houses " + a.house() + " and " + b.house() + ").",
            List.of(a.name(), b.name())));
      }
    }
  }

  private static void kaalSarp(List<Yoga> yogas, List<Position> planets) {
    Position rahu = find(planets, "Rahu");
    boolean forward = true;
    boolean reverse = true;
    for (String name : SEVEN) {
      double d = AstroMath.norm(find(planets, name).longitude() - rahu.longitude());
      if (d > 180) forward = false;
      if (d < 180) reverse = false;
    }
    if (!forward && !reverse) return;
    String kind = KAAL_SARP[rahu.house() - 1];
    yogas.add(new Yoga("Kaal Sarp Yoga (" + kind + ")",
        "All seven planets lie between Rahu and Ketu" + (forward ? " (Rahu to Ketu)." : " (Ketu to Rahu).")
            + " Rahu is in the " + ordinal(rahu.house()) + " house.", List.of("Rahu", "Ketu")));
  }

  private static void pitraDosha(List<Yoga> yogas, Position ascendant, List<Position> planets) {
    Position sun = find(planets, "Sun");
    Position rahu = find(planets, "Rahu");
    Position ketu = find(planets, "Ketu");
    List<String> factors = new ArrayList<>();
    if (sun.signNumber() == rahu.signNumber() || sun.signNumber() == ketu.signNumber()) {
      factors.add("The Sun is conjunct a lunar node.");
    }
    if (rahu.house() == 9 || ketu.house() == 9) factors.add("A lunar node occupies the 9th house.");
    String ninthLord = Dignity.signLord((ascendant.signNumber() - 1 + 8) % 12);
    Position lord = find(planets, ninthLord);
    if (lord.signNumber() == rahu.signNumber() || lord.signNumber() == ketu.signNumber()) {
      factors.add("The 9th lord (" + ninthLord + ") is conjunct a lunar node.");
    }
    if (sun.house() == 9 && find(planets, "Saturn").signNumber() == sun.signNumber()) {
      factors.add("The Sun and Saturn are together in the 9th house.");
    }
    if (!factors.isEmpty()) {
      yogas.add(new Yoga("Pitra Dosha", String.join(" ", factors), List.of("Sun", "Rahu", "Ketu")));
    }
  }

  private static int relativeHouse(Position from, Position to) {
    return Math.floorMod(to.signNumber() - from.signNumber(), 12) + 1;
  }

  private static boolean isKendra(int house) {
    return house == 1 || house == 4 || house == 7 || house == 10;
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
