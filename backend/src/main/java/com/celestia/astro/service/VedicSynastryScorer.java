package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.ChartResponse.Position;
import com.celestia.astro.model.KundliMatchResponse.HouseConnection;
import com.celestia.astro.model.KundliMatchResponse.LayerScore;
import com.celestia.astro.model.KundliMatchResponse.RuleResult;
import com.celestia.astro.model.KundliMatchResponse.Compatibility;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Separate-score Vedic compatibility and sign-based synastry. Scores are never blended with Ashtakoota. */
public final class VedicSynastryScorer {
  private static final List<String> EIGHT_PLANETS = List.of("Sun", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu");
  private static final List<String> MALefics = List.of("Saturn", "Mars", "Sun", "Rahu", "Ketu");
  private static final Set<Integer> ANGLES = Set.of(1, 4, 7, 10);
  private static final Set<Integer> FAVOURABLE = Set.of(1, 2, 3, 4, 5, 7, 9, 10, 11);
  private static final Set<Integer> SUPPORTIVE = Set.of(1, 2, 4, 5, 7, 9, 10, 11);
  private static final Map<String, Set<String>> FRIENDS = Map.of(
      "Sun", Set.of("Moon", "Mars", "Jupiter"), "Moon", Set.of("Sun", "Mercury"),
      "Mars", Set.of("Sun", "Moon", "Jupiter"), "Mercury", Set.of("Sun", "Venus"),
      "Jupiter", Set.of("Sun", "Moon", "Mars"), "Venus", Set.of("Mercury", "Saturn"),
      "Saturn", Set.of("Mercury", "Venus"));
  private static final Map<String, Set<String>> ENEMIES = Map.of(
      "Sun", Set.of("Venus", "Saturn"), "Moon", Set.of(), "Mars", Set.of("Mercury"),
      "Mercury", Set.of("Moon"), "Jupiter", Set.of("Mercury", "Venus"),
      "Venus", Set.of("Sun", "Moon"), "Saturn", Set.of("Sun", "Moon", "Mars"));
  private static final List<String> VIMSHOTTARI = List.of("Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury");
  private static final String[] NAKSHATRA_LORDS = {
      "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
      "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
      "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"};

  private VedicSynastryScorer() {}

  public static Compatibility score(ChartResponse bride, ChartResponse groom) {
    List<RuleResult> other = new ArrayList<>();
    kuja(other, bride, groom);
    malefics(other, bride, groom);
    lagnas(other, bride, groom);
    lagnaLords(other, bride, groom);
    seventhHouses(other, bride, groom);
    seventhLords(other, bride, groom);
    eighthLords(other, bride, groom);
    eightPlanets(other, bride, groom);
    lagnaMoon(other, bride, groom);
    venusMars(other, bride, groom);
    venusAssociation(other, bride, groom);
    LayerScore otherScore = layer("Other Vedic", 50, other);

    List<HouseConnection> connections = connectionSimilarity(bride, groom);
    long matchedHouses = connections.stream().filter(HouseConnection::matched).count();
    double chancePoints = matchedHouses * (5.0 / 12.0);
    RuleResult connectionRule = new RuleResult("Connection-set similarity", matchedHouses > 0, chancePoints, 5,
        matchedHouses + " of 12 corresponding house connection sets overlap.",
        connections.stream().map(c -> "H" + c.house() + " " + (c.matched() ? "matches" : "does not match")
            + " (overlap " + c.overlap() + ")").toList());
    List<RuleResult> chanceRules = new ArrayList<>();
    chanceRules.add(connectionRule);
    chanceRules.addAll(similarityIndicators(bride, groom));
    LayerScore chance = new LayerScore("Chance of Marriage", chancePoints, 5, List.copyOf(chanceRules));

    List<RuleResult> direct = directSynastry(bride, groom);
    List<RuleResult> marriage = marriageSynastry(bride, groom);
    List<String> notes = List.of(
        "Ashtakoota / Moon Vedic scoring remains its own 36-point system and is not added to Other Vedic or synastry.",
        "Other Vedic is scored out of 50. Chance of Marriage is a separate connection-pattern score out of 5.",
        "Direct and marriage-specific synastry highlights have their own per-rule points; they are not added to either compatibility total.",
        "Rule weights are a transparent first implementation of the supplied scoring specification; traditional variants and cancellation rules differ by lineage.");
    return new Compatibility(otherScore, chance, direct, marriage, connections, notes);
  }

  private static LayerScore layer(String name, double max, List<RuleResult> rules) {
    return new LayerScore(name, rules.stream().mapToDouble(RuleResult::points).sum(), max, List.copyOf(rules));
  }

  private static RuleResult rule(String name, double points, double max, String reason, List<String> evidence) {
    return new RuleResult(name, points > 0, round(points), max, reason, List.copyOf(evidence));
  }

  private static double round(double n) { return Math.round(n * 100.0) / 100.0; }
  private static int rel(int base, int target) { return Math.floorMod(target - base, 12) + 1; }
  private static Position find(ChartResponse chart, String name) {
    if (name.equals("Ascendant")) return chart.ascendant();
    return chart.planets().stream().filter(p -> p.name().equals(name)).findFirst().orElseThrow();
  }
  private static int houseFrom(Position base, Position target) { return rel(base.signNumber(), target.signNumber()); }
  private static String lord(int signNumber) { return Dignity.signLord(signNumber - 1); }
  private static boolean friend(String a, String b) { return a.equals(b) || FRIENDS.getOrDefault(a, Set.of()).contains(b); }
  private static boolean enemy(String a, String b) { return ENEMIES.getOrDefault(a, Set.of()).contains(b); }
  private static boolean mutualFriend(String a, String b) { return a.equals(b) || friend(a, b) && friend(b, a); }
  private static String friendship(String a, String b) {
    if (a.equals(b)) return "same ruler";
    boolean ab = friend(a, b), ba = friend(b, a), ae = enemy(a, b), be = enemy(b, a);
    if (ab && ba) return "mutual friends";
    if (ae && be) return "mutual enemies";
    if (ab || ba) return "friend and neutral";
    if (ae || be) return "enemy and neutral";
    return "mutual neutral";
  }

  private static void kuja(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    int[] refs = {0, 1, 2};
    String[] refNames = {"Lagna", "Moon", "Venus"};
    int brideActive = 0, groomActive = 0;
    List<String> evidence = new ArrayList<>();
    for (int i : refs) {
      Position bRef = i == 0 ? bride.ascendant() : find(bride, refNames[i]);
      Position gRef = i == 0 ? groom.ascendant() : find(groom, refNames[i]);
      Kuja b = kujaFrom(bride, bRef), g = kujaFrom(groom, gRef);
      evidence.add("Bride from " + refNames[i] + ": " + b.describe);
      evidence.add("Groom from " + refNames[i] + ": " + g.describe);
      if (b.active) brideActive++;
      if (g.active) groomActive++;
    }
    boolean balanced = brideActive == groomActive;
    double points = balanced ? 9 : brideActive == 0 || groomActive == 0 ? 4.5 : 6;
    evidence.add("Final active reference counts after reference-specific cancellations: bride " + brideActive + "/3, groom " + groomActive + "/3.");
    out.add(rule("Kuja Dosha", points, 9, balanced ? "Both charts have comparable Mars-affliction patterns after cancellation checks." : "The post-cancellation Mars-affliction counts differ between charts.", evidence));
  }

  private record Kuja(boolean active, String describe) {}
  private static Kuja kujaFrom(ChartResponse chart, Position ref) {
    Position mars = find(chart, "Mars");
    int house = houseFrom(ref, mars);
    if (!Set.of(1, 2, 4, 7, 8, 12).contains(house)) return new Kuja(false, "no Mars dosha from house " + house + ".");
    List<String> cancel = new ArrayList<>();
    if ("OWN".equals(mars.dignity()) || "EXALTED".equals(mars.dignity())) cancel.add("Mars own/exalted sign");
    for (String division : List.of("D7", "D9")) {
      Integer vargaSign = mars.divisionalSigns().get(division);
      if (vargaSign != null) {
        String vargaDignity = Dignity.dignity("Mars", vargaSign - 1);
        if ("OWN".equals(vargaDignity) || "EXALTED".equals(vargaDignity)) {
          cancel.add("Mars own/exalted in " + division);
        }
      }
    }
    if (house == 2 && Set.of(3, 6).contains(mars.signNumber()) || house == 4 && Set.of(1, 8).contains(mars.signNumber())
        || house == 7 && Set.of(4, 10).contains(mars.signNumber()) || house == 8 && Set.of(9, 12).contains(mars.signNumber())
        || house == 12 && Set.of(2, 7).contains(mars.signNumber())) cancel.add("house/sign cancellation");
    if (sameSign(find(chart, "Jupiter"), mars) || aspectsHouse(chart, "Jupiter", house)) cancel.add("Jupiter conjunction/aspect");
    if (sameSign(ref, mars) && !ref.name().equals("Ascendant")) cancel.add("Mars conjunct reference");
    String text = cancel.isEmpty() ? "Mars in H" + house + " from " + ref.name() + " (active)."
        : "Mars in H" + house + " from " + ref.name() + "; cancelled by " + String.join(", ", cancel) + ".";
    return new Kuja(cancel.isEmpty(), text);
  }

  private static boolean sameSign(Position a, Position b) { return a.signNumber() == b.signNumber(); }

  private static void malefics(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    List<String> evidence = new ArrayList<>();
    int points = 0;
    for (String name : MALefics) {
      int b = find(bride, name).house(), g = find(groom, name).house();
      boolean matched = ANGLES.contains(b) && ANGLES.contains(g);
      if (matched && points < 4) points++;
      evidence.add(name + " → Groom H" + g + " / Bride H" + b + " → Match: " + (matched ? 1 : 0));
    }
    out.add(rule("Angular malefic balance", points, 4, "One point per corresponding natural malefic occupying an angular house (1, 4, 7 or 10) in both charts.", evidence));
  }

  private static void lagnas(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    int b = bride.ascendant().signNumber(), g = groom.ascendant().signNumber();
    int d = rel(b, g);
    String bl = lord(b), gl = lord(g);
    double signPoint = b == g || Set.of(1, 5, 9).contains(d) || mutualFriend(bl, gl) ? 1 : 0;
    boolean challenged = Set.of(6, 8, 12).contains(d) || Set.of(6, 8, 12).contains(rel(g, b));
    double housePoint = challenged ? 0 : 1;
    boolean bHemmed = hemmed(bride, bride.ascendant().signNumber()), gHemmed = hemmed(groom, groom.ascendant().signNumber());
    double hemmingPoint = !bHemmed && !gHemmed ? 1 : bHemmed && gHemmed ? 0.25 : 0.5;
    List<String> evidence = List.of("Ascendants are " + AstroMath.signName(b - 1) + " and " + AstroMath.signName(g - 1) + ", houses apart: " + d + ".",
        challenged ? "The sign distance includes a 6/8/12 relationship." : "No 6/8/12 sign relationship.",
        "Lagna lords: " + bl + " and " + gl + " (" + friendship(bl, gl) + ").",
        "Malefic hemming: bride " + bHemmed + ", groom " + gHemmed + ".");
    out.add(rule("Lagnas", signPoint + housePoint + hemmingPoint, 3, "Combines sign relationship, 6/8/12 challenge, ascendant-lord affinity and malefic hemming.", evidence));
  }

  private static void lagnaLords(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    String bl = lord(bride.ascendant().signNumber()), gl = lord(groom.ascendant().signNumber());
    Position bp = find(bride, bl), gp = find(groom, gl);
    int bg = houseFrom(groom.ascendant(), bp), gb = houseFrom(bride.ascendant(), gp);
    double position = (SUPPORTIVE.contains(bg) ? 1 : 0) + (SUPPORTIVE.contains(gb) ? 1 : 0);
    double friendship = mutualFriend(bl, gl) ? 2 : friend(bl, gl) || friend(gl, bl) ? 1 : 0;
    int maleficAspects = (isAfflictedByMalefics(bride, bp) ? 1 : 0) + (isAfflictedByMalefics(groom, gp) ? 1 : 0);
    double points = position + friendship + (maleficAspects == 0 ? 1 : maleficAspects == 1 ? 0.5 : 0);
    out.add(rule("Lagna Lords", points, 5, "Compares placement in the partner's chart, natural planetary friendship and malefic aspects.",
        List.of("Bride Lagna lord " + bl + " falls in Groom H" + bg + ".", "Groom Lagna lord " + gl + " falls in Bride H" + gb + ".",
            "Lagna-lord relationship: " + friendship(bl, gl) + ".", "Malefic aspect affliction count: " + maleficAspects + ".")));
  }

  private static void seventhHouses(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    List<String> evidence = new ArrayList<>();
    double points = 0;
    for (ChartResponse c : List.of(bride, groom)) {
      String who = c == bride ? "Bride" : "Groom";
      int sign = signAtHouse(c.ascendant().signNumber(), 7);
      String sevenLord = lord(sign);
      boolean hemmed = hemmed(c, sign);
      boolean dustLordImpact = hasDustLordImpact(c, 7);
      double score = (hemmed ? 0 : 0.5) + (dustLordImpact ? 0 : 0.5);
      points += score;
      evidence.add(who + " 7th house " + AstroMath.signName(sign - 1) + "; occupants " + occupants(c, sign) + "; lord " + sevenLord + ".");
      evidence.add(who + " severe hemming: " + hemmed + "; severe 6/8/12-lord involvement: " + dustLordImpact + ".");
    }
    out.add(rule("7th Houses", points, 2, "One point per chart for an unhemmed 7th house without severe 6th, 8th or 12th lord involvement.", evidence));
  }

  private static void seventhLords(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    String b7 = lord(signAtHouse(bride.ascendant().signNumber(), 7));
    String g7 = lord(signAtHouse(groom.ascendant().signNumber(), 7));
    Position bp = find(bride, b7), gp = find(groom, g7);
    int bInG = houseFrom(groom.ascendant(), bp), gInB = houseFrom(bride.ascendant(), gp);
    double friendship = mutualFriend(b7, g7) ? 2 : friend(b7, g7) || friend(g7, b7) ? 1 : 0;
    int distance = rel(bp.signNumber(), gp.signNumber());
    double signDistance = Set.of(1, 5, 7, 9).contains(distance) ? 1 : 0;
    double cross = (Set.of(1, 5, 7, 9, 10, 11).contains(bInG) ? 1 : 0) + (Set.of(1, 5, 7, 9, 10, 11).contains(gInB) ? 1 : 0);
    out.add(rule("7th Lords", friendship + signDistance + cross, 5, "Compares friendship, sign relationship and how each marriage lord lands in the partner's chart.",
        List.of("Bride 7th lord " + b7 + " falls in Groom H" + bInG + ".", "Groom 7th lord " + g7 + " falls in Bride H" + gInB + ".",
            "The two 7th lords are " + friendship(b7, g7) + " and " + distance + " signs apart.")));
  }

  private static void eighthLords(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    String b8 = lord(signAtHouse(bride.ascendant().signNumber(), 8));
    String g8 = lord(signAtHouse(groom.ascendant().signNumber(), 8));
    int bInG = houseFrom(groom.ascendant(), find(bride, b8));
    int gInB = houseFrom(bride.ascendant(), find(groom, g8));
    double placement = (SUPPORTIVE.contains(bInG) ? 0.75 : 0) + (SUPPORTIVE.contains(gInB) ? 0.75 : 0);
    double relation = mutualFriend(b8, g8) ? 1.5 : friend(b8, g8) || friend(g8, b8) ? 0.75 : 0;
    out.add(rule("8th Lords", placement + relation, 3, "Reviews resilience and longevity indicators without treating the 8th house as automatically bad.",
        List.of("Bride 8th lord " + b8 + " falls in Groom H" + bInG + ".", "Groom 8th lord " + g8 + " falls in Bride H" + gInB + ".",
            "The two 8th lords are " + friendship(b8, g8) + ".")));
  }

  private static void eightPlanets(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    List<String> evidence = new ArrayList<>();
    double points = 0;
    for (String name : EIGHT_PLANETS) {
      Position b = find(bride, name), g = find(groom, name);
      int distance = rel(b.signNumber(), g.signNumber());
      boolean r1 = FAVOURABLE.contains(distance);
      String bSignLord = lord(b.signNumber()), gSignLord = lord(g.signNumber());
      String relationship = friendship(bSignLord, gSignLord);
      boolean r2 = mutualFriend(bSignLord, gSignLord) || bSignLord.equals(gSignLord);
      int value = (r1 ? 1 : 0) + (r2 ? 1 : 0);
      points += value;
      evidence.add(name + " → Groom " + gSignLord + " / Bride " + bSignLord + "; distance " + distance
          + "; R1 " + (r1 ? "✓" : "×") + "; relationship " + relationship + "; R2 " + (r2 ? "✓" : "×") + "; points " + value + ".");
    }
    out.add(rule("Eight Planets", points, 16, "Eight matching rows, each scoring one for sign-distance support and one for supportive sign-lord friendship.", evidence));
  }

  private static void lagnaMoon(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    int brideMoon = houseFrom(groom.ascendant(), find(bride, "Moon"));
    int groomMoon = houseFrom(bride.ascendant(), find(groom, "Moon"));
    boolean first = FAVOURABLE.contains(brideMoon), second = FAVOURABLE.contains(groomMoon);
    out.add(rule("Lagna–Moon", first && second ? 1 : 0, 1, "Cross-checks each Moon from the other person's Ascendant.",
        List.of("Bride Moon from Groom Ascendant: H" + brideMoon + " → " + (first ? "favourable" : "challenging") + ".",
            "Groom Moon from Bride Ascendant: H" + groomMoon + " → " + (second ? "favourable" : "challenging") + ".")));
  }

  private static void venusMars(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    int gmToBv = houseFrom(find(bride, "Venus"), find(groom, "Mars"));
    int gvToBm = houseFrom(find(bride, "Mars"), find(groom, "Venus"));
    boolean a = !Set.of(2, 6, 8, 12).contains(gmToBv);
    boolean b = !Set.of(2, 6, 8, 12).contains(gvToBm);
    out.add(rule("Venus and Mars", a && b ? 1 : 0, 1, "Checks mutual Venus–Mars chemistry by Vedic sign/house relationship, not Western aspects.",
        List.of("Groom Mars from Bride Venus: H" + gmToBv + (a ? " supportive." : " challenging (avoid 2/12 or 6/8)."),
            "Groom Venus from Bride Mars: H" + gvToBm + (b ? " supportive." : " challenging (avoid 2/12 or 6/8)."))));
  }

  private static void venusAssociation(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    boolean b = venusSupported(bride), g = venusSupported(groom);
    out.add(rule("Venus Association", b && g ? 1 : 0, 1, "Both charts need Jupiter or Moon conjunct with or aspecting Venus.",
        List.of("Bride Venus association: " + (b ? "supported" : "not found") + ".", "Groom Venus association: " + (g ? "supported" : "not found") + ".")));
  }

  private static boolean venusSupported(ChartResponse c) {
    int venusSign = find(c, "Venus").signNumber();
    for (String benefic : List.of("Jupiter", "Moon")) {
      Position p = find(c, benefic);
      if (p.signNumber() == venusSign || aspectsSign(c, benefic, venusSign)) return true;
    }
    return false;
  }

  private static List<HouseConnection> connectionSimilarity(ChartResponse bride, ChartResponse groom) {
    List<HouseConnection> rows = new ArrayList<>();
    for (int house = 1; house <= 12; house++) {
      Set<Integer> b = connectionSet(bride, house), g = connectionSet(groom, house);
      Set<Integer> overlap = new HashSet<>(b);
      overlap.retainAll(g);
      rows.add(new HouseConnection(house, b.stream().sorted().toList(), g.stream().sorted().toList(),
          overlap.stream().sorted().toList(), !overlap.isEmpty()));
    }
    return List.copyOf(rows);
  }

  private static List<RuleResult> similarityIndicators(ChartResponse bride, ChartResponse groom) {
    List<RuleResult> out = new ArrayList<>();
    int sameStrength = 0, sameAngles = 0, similarLords = 0;
    List<String> strengthEvidence = new ArrayList<>(), angleEvidence = new ArrayList<>(), lordEvidence = new ArrayList<>();
    for (String name : EIGHT_PLANETS) {
      Position b = find(bride, name), g = find(groom, name);
      boolean bExalted = "EXALTED".equals(b.dignity()), gExalted = "EXALTED".equals(g.dignity());
      boolean bDebilitated = "DEBILITATED".equals(b.dignity()), gDebilitated = "DEBILITATED".equals(g.dignity());
      if (bExalted && gExalted || bDebilitated && gDebilitated) {
        sameStrength++;
        strengthEvidence.add(name + " has the same " + (bExalted ? "exalted" : "debilitated") + " status in both charts.");
      }
      boolean bAngle = ANGLES.contains(b.house()), gAngle = ANGLES.contains(g.house());
      if (bAngle && gAngle) {
        sameAngles++;
        angleEvidence.add(name + " is angular in both charts (Groom H" + g.house() + ", Bride H" + b.house() + ").");
      }
    }
    for (int house = 1; house <= 12; house++) {
      String bLord = lord(signAtHouse(bride.ascendant().signNumber(), house));
      String gLord = lord(signAtHouse(groom.ascendant().signNumber(), house));
      int bPlacement = find(bride, bLord).house(), gPlacement = find(groom, gLord).house();
      if (bLord.equals(gLord) || rel(bPlacement, gPlacement) == 1 || Set.of(5, 7, 9).contains(rel(bPlacement, gPlacement))) {
        similarLords++;
        lordEvidence.add("H" + house + " lords " + bLord + "/" + gLord + " have similar placements.");
      }
    }
    out.add(new RuleResult("Same exaltation/debilitation patterns", sameStrength > 0, 0, 0,
        "Similarity indicator only; it does not add points beyond connection-set overlap.", strengthEvidence));
    out.add(new RuleResult("Similar angular placements", sameAngles > 0, 0, 0,
        "Similarity indicator only; it does not add points beyond connection-set overlap.", angleEvidence));
    out.add(new RuleResult("Similar house-lord patterns", similarLords > 0, 0, 0,
        "Similarity indicator only; it does not add points beyond connection-set overlap.", lordEvidence));
    return out;
  }

  private static Set<Integer> connectionSet(ChartResponse chart, int sourceHouse) {
    int targetSign = signAtHouse(chart.ascendant().signNumber(), sourceHouse);
    Set<Integer> result = new HashSet<>();
    String houseLord = lord(targetSign);
    result.add(find(chart, houseLord).house());
    List<Position> inHouse = chart.planets().stream().filter(p -> p.signNumber() == targetSign).toList();
    if (!inHouse.isEmpty()) result.add(sourceHouse);
    for (Position p : inHouse) for (int aspectHouse : aspectHouses(p.name(), p.house())) result.add(aspectHouse);
    for (String name : EIGHT_PLANETS) {
      Position p = find(chart, name);
      if (aspectsHouse(chart, name, targetSign)) result.add(p.house());
    }
    // A nakshatra lord adds the occupied house as a star-channel connection.
    result.add(find(chart, nakshatraLord(find(chart, houseLord).nakshatra())).house());
    for (Position p : inHouse) result.add(find(chart, nakshatraLord(p.nakshatra())).house());
    return result;
  }

  private static String nakshatraLord(String nakshatra) {
    String[] names = {"Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
        "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
        "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"};
    int index = 0;
    for (int i = 0; i < names.length; i++) if (names[i].equals(nakshatra)) { index = i; break; }
    return NAKSHATRA_LORDS[index];
  }

  private static void directHighlight(List<RuleResult> out, String name, double points, double max,
                                      String reason, String evidence) {
    if (points > 0) out.add(rule(name, points, max, reason, List.of(evidence)));
  }

  private static List<RuleResult> directSynastry(ChartResponse bride, ChartResponse groom) {
    List<RuleResult> out = new ArrayList<>();
    sameSignHighlights(out, bride, groom);
    overlayHighlights(out, "Groom", groom, "Bride", bride, false);
    overlayHighlights(out, "Bride", bride, "Groom", groom, false);
    Position bv = find(bride, "Venus"), gv = find(groom, "Venus");
    int vvHouse = houseFrom(bv, gv);
    if (vvHouse == 1 || vvHouse == 5 || vvHouse == 7 || vvHouse == 9) directHighlight(out, "Venus–Venus", vvHouse == 1 ? 4 : 5, 5,
        "Similar love language and relationship values.", "The two Venus signs form a " + vvHouse + "th-house relationship.");
    Position bm = find(bride, "Moon"), gm = find(groom, "Moon");
    int moonHouse = houseFrom(bm, gm);
    if (bm.signNumber() == gm.signNumber() || bm.nakshatra().equals(gm.nakshatra()) || Set.of(1, 5, 7).contains(moonHouse)) {
      directHighlight(out, "Moon–Moon", bm.nakshatra().equals(gm.nakshatra()) ? 5 : 4, 5,
          "Emotional habits may feel familiar and easier to understand.", "Moon signs: " + AstroMath.signName(bm.signNumber() - 1) + " / " + AstroMath.signName(gm.signNumber() - 1) + "; nakshatras: " + bm.nakshatra() + " / " + gm.nakshatra() + ".");
    }
    crossPersonal(out, "Sun–Moon", find(groom, "Sun"), bride, List.of("Moon"));
    crossPersonal(out, "Moon–Sun", find(groom, "Moon"), bride, List.of("Sun"));
    crossPersonal(out, "Jupiter–Venus", find(groom, "Jupiter"), bride, List.of("Venus"));
    crossPersonal(out, "Jupiter–Moon", find(groom, "Jupiter"), bride, List.of("Moon"));
    crossPersonal(out, "Saturn–Venus", find(groom, "Saturn"), bride, List.of("Venus"));
    crossPersonal(out, "Rahu–Venus intensity", find(groom, "Rahu"), bride, List.of("Venus"));
    crossPersonal(out, "Ketu–Moon familiarity / detachment", find(groom, "Ketu"), bride, List.of("Moon"));
    return List.copyOf(out);
  }

  private static void sameSignHighlights(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    Set<String> dedicated = Set.of("Moon/Moon", "Venus/Venus", "Sun/Sun", "Mars/Mars");
    for (Position groomPlanet : groom.planets()) {
      for (Position bridePlanet : bride.planets()) {
        if (!sameSign(groomPlanet, bridePlanet)) continue;
        String pair = groomPlanet.name() + "/" + bridePlanet.name();
        if (dedicated.contains(pair)) {
          int points = switch (groomPlanet.name()) { case "Moon", "Venus" -> 4; case "Sun" -> 3; default -> 2; };
          if (groomPlanet.name().equals("Moon") && groomPlanet.nakshatra().equals(bridePlanet.nakshatra())) points = 5;
          directHighlight(out, groomPlanet.name() + "–" + bridePlanet.name() + " resonance", points, 5,
              "A shared sign can make this planetary theme feel familiar between you.",
              "Groom " + groomPlanet.name() + " and Bride " + bridePlanet.name() + " are both in "
                  + AstroMath.signName(groomPlanet.signNumber() - 1) + ".");
        } else {
          directHighlight(out, groomPlanet.name() + " → " + bridePlanet.name() + " by sign", 2, 2,
              "This shared-sign contact links the two chart themes; its expression depends on the planets involved.",
              "Groom " + groomPlanet.name() + " and Bride " + bridePlanet.name() + " are both in "
                  + AstroMath.signName(groomPlanet.signNumber() - 1) + ".");
        }
      }
    }
  }

  private static void overlayHighlights(List<RuleResult> out, String sourceName, ChartResponse source,
                                        String targetName, ChartResponse target, boolean marriageLayer) {
    Map<String, Double> weights = Map.of("Venus", 4.0, "Jupiter", 4.0, "Moon", 3.5, "Sun", 3.0, "Mars", 3.0,
        "Mercury", 3.0, "Saturn", 2.0, "Rahu", 4.0, "Ketu", 2.0);
    for (Position p : source.planets()) {
      int house = houseFrom(target.ascendant(), p);
      if (house == 7) {
        directHighlight(out, p.name() + " → " + targetName + " 7th house", weights.getOrDefault(p.name(), 2.0), 5,
        p.name() + " activates partnership themes.", sourceName + " " + p.name() + " falls in " + targetName + "'s 7th house.");
      }
      if (p.name().equals("Venus") && house != 7) {
        int points = switch (house) { case 1, 8 -> 4; case 5, 7 -> 5; case 11 -> 3; default -> 0; };
        directHighlight(out, "Venus → " + targetName + " H" + house, points, 5,
        house == 1 ? "Attraction and recognition; your partner notices you strongly." : house == 5 ? "Strong romance and affection." : house == 8 ? "Attraction and intimacy; this can feel intense." : house == 11 ? "Friendship, shared goals and gains." : "Affection, romance or partnership warmth.",
            sourceName + " Venus falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Moon") && house != 7) {
        int points = switch (house) { case 1, 4, 5, 7 -> 4; case 8 -> 3; case 12 -> 1; default -> 0; };
        String reason = house == 8 ? "Emotional intensity and vulnerability." : house == 12 ? "Private or subconscious emotional connection." : "Emotional recognition, comfort or partnership orientation.";
        directHighlight(out, "Moon → " + targetName + " H" + house, points, 4, reason,
            sourceName + " Moon falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Mars") && house != 7 && Set.of(1, 5, 8).contains(house)) {
        directHighlight(out, "Mars → " + targetName + " H" + house, house == 8 ? 4 : 3, 4,
            house == 8 ? "Strong physical and intimate intensity; not automatically easy." : "Drive and physical chemistry.",
            sourceName + " Mars falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Jupiter") && house != 7 && Set.of(1, 4, 5, 7, 9).contains(house)) {
        directHighlight(out, "Jupiter → " + targetName + " H" + house, house == 1 || house == 7 ? 5 : 4, 5,
        "Jupiter supports goodwill, growth and trust in this area.", sourceName + " Jupiter falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Saturn") && house != 7 && Set.of(1, 4, 5, 7, 8, 10).contains(house)) {
        directHighlight(out, "Saturn → " + targetName + " H" + house, Set.of(1, 7).contains(house) ? 3 : 2, 5,
        "Responsibility and durability; this can feel supportive or restrictive depending on the rest of the chart.", sourceName + " Saturn falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Rahu") && house != 7 && Set.of(1, 4, 5, 8).contains(house)) {
        directHighlight(out, "Rahu intensity → " + targetName + " H" + house, 4, 5, "Strong fascination or unconventional pull; intensity flag.",
            sourceName + " Rahu falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Ketu") && house != 7 && Set.of(1, 4, 5, 8, 12).contains(house)) {
        directHighlight(out, "Ketu familiarity / detachment → " + targetName + " H" + house, 0, 5, "A familiar or spiritual pull with a possible need for emotional space.",
            sourceName + " Ketu falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Mercury") && Set.of(4, 5, 11).contains(house)) {
        directHighlight(out, "Mercury → " + targetName + " H" + house, 3, 5,
        house == 11 ? "Conversation and shared goals can strengthen friendship." : "Communication helps the bond feel playful and understood.",
        sourceName + " Mercury falls in " + targetName + "'s " + house + "th house.");
      }
      if (p.name().equals("Sun") && Set.of(1, 5, 7).contains(house)) {
        directHighlight(out, "Sun → " + targetName + " H" + house, 3, 5,
        "This brings visibility and identity into the relationship; keep mutual respect central.",
        sourceName + " Sun falls in " + targetName + "'s " + house + "th house.");
      }
    }
  }

  private static void crossPersonal(List<RuleResult> out, String label, Position source, ChartResponse target, List<String> targetNames) {
    for (String targetName : targetNames) {
      Position p = find(target, targetName);
      int house = houseFrom(p, source);
      double points = source.signNumber() == p.signNumber() ? 5 : Set.of(1, 5, 7, 9).contains(house) ? 4 : 0;
      if (source.name().equals("Rahu")) points = source.signNumber() == p.signNumber() ? 4 : 0;
      if (source.name().equals("Ketu")) points = 0;
      directHighlight(out, label, points, 5,
          source.name().equals("Saturn") ? "Commitment and responsibility; its expression depends on the rest of both charts."
              : source.name().equals("Rahu") ? "Intensity or fascination; this is a flag, not a positive/negative verdict."
                  : source.name().equals("Ketu") ? "Familiarity or detachment; interpret with care." : "Supportive emotional or affectionate connection.",
          source.name() + " in " + AstroMath.signName(source.signNumber() - 1) + " and " + targetName + " in " + AstroMath.signName(p.signNumber() - 1) + " (" + house + " signs apart).");
    }
  }

  private static List<RuleResult> marriageSynastry(ChartResponse bride, ChartResponse groom) {
    List<RuleResult> out = new ArrayList<>();
    overlayHighlights(out, "Groom", groom, "Bride", bride, true);
    overlayHighlights(out, "Bride", bride, "Groom", groom, true);
    addSeventhLord(out, "Groom", groom, "Bride", bride);
    addSeventhLord(out, "Bride", bride, "Groom", groom);
    addJaiminiPartnerSignals(out, bride, groom);
    addLagnaLordSynastry(out, bride, groom);
    return List.copyOf(out);
  }

  private static Position charaKarakara(ChartResponse chart, int rank) {
    List<String> visible = List.of("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn");
    List<Position> sorted = chart.planets().stream().filter(p -> visible.contains(p.name()))
        .sorted((a, b) -> Double.compare(b.degreeInSign(), a.degreeInSign())).toList();
    return sorted.get(rank);
  }

  private static void addJaiminiPartnerSignals(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    Position brideAk = charaKarakara(bride, 0), brideDk = charaKarakara(bride, 6);
    Position groomAk = charaKarakara(groom, 0), groomDk = charaKarakara(groom, 6);
    addKarakaOverlay(out, "Groom DK " + groomDk.name(), groomDk, "Bride", bride);
    addKarakaOverlay(out, "Bride DK " + brideDk.name(), brideDk, "Groom", groom);
    addPairSignal(out, "Groom AK ↔ Bride DK", groomAk, brideDk, 6);
    addPairSignal(out, "Bride AK ↔ Groom DK", brideAk, groomDk, 6);
    String relationship = friendship(brideDk.name(), groomDk.name());
    int rel = rel(brideDk.signNumber(), groomDk.signNumber());
    double friendshipPoints = relationship.equals("mutual friends") || relationship.equals("same ruler") ? 3
        : relationship.equals("friend and neutral") ? 2 : relationship.equals("mutual neutral") ? 1
            : relationship.equals("mutual enemies") ? -1 : 0;
    double positionPoints = Set.of(1, 5, 7, 9).contains(rel) ? 1 : 0;
    out.add(rule("DK ↔ DK", friendshipPoints + positionPoints, 4,
        "Compares the two spouse significators by planetary friendship and sign relationship.",
        List.of("Bride DK " + brideDk.name() + " and Groom DK " + groomDk.name() + " are " + relationship + ".",
            "They are " + rel + " signs apart.")));
  }

  private static void addKarakaOverlay(List<RuleResult> out, String label, Position karaka, String targetName, ChartResponse target) {
    Position moon = find(target, "Moon"), venus = find(target, "Venus");
    List<SignContact> contacts = List.of(
      new SignContact("Ascendant", target.ascendant().signNumber()),
      new SignContact("Moon", moon.signNumber()),
      new SignContact("Venus", venus.signNumber()),
      new SignContact("7th house", signAtHouse(target.ascendant().signNumber(), 7)));
    for (SignContact contact : contacts) {
      int distance = rel(contact.signNumber(), karaka.signNumber());
      if (Set.of(1, 5, 7, 9).contains(distance)) out.add(rule(label + " → " + targetName + " " + contact.label(), 5, 5,
          "Jaimini's spouse significator contacts a key point in the partner's chart.",
        List.of(karaka.name() + " falls " + distance + " signs from " + targetName + " " + contact.label() + ".")));
    }
    for (Position personal : List.of(moon, venus)) {
      if (karaka.signNumber() == personal.signNumber()) {
        out.add(rule(label + " same sign as " + targetName + " " + personal.name(), 4, 5,
            "The spouse significator resonates by sign with a personal planet.",
            List.of(karaka.name() + " and " + targetName + " " + personal.name() + " share " + AstroMath.signName(personal.signNumber() - 1) + ".")));
      }
    }
  }

  private record SignContact(String label, int signNumber) {}

  private static void addPairSignal(List<RuleResult> out, String label, Position a, Position b, double max) {
    int distance = rel(a.signNumber(), b.signNumber());
    double points = a.signNumber() == b.signNumber() ? 6 : Set.of(1, 7).contains(distance) ? 5 : Set.of(5, 9).contains(distance) ? 4 : 0;
    if (points > 0) out.add(rule(label, points, max, "Soul and spouse significators connect, a notable Jaimini relationship signal.",
        List.of(a.name() + " and " + b.name() + " are " + distance + " signs apart.")));
  }

  private static void addLagnaLordSynastry(List<RuleResult> out, ChartResponse bride, ChartResponse groom) {
    String brideLord = lord(bride.ascendant().signNumber());
    String groomLord = lord(groom.ascendant().signNumber());
    Position b = find(bride, brideLord), g = find(groom, groomLord);
    int gInBride = houseFrom(bride.ascendant(), g), bInGroom = houseFrom(groom.ascendant(), b);
    int signRelation = rel(b.signNumber(), g.signNumber());
    double friends = mutualFriend(brideLord, groomLord) ? 3 : friend(brideLord, groomLord) || friend(groomLord, brideLord) ? 2 : 0;
    double placements = (Set.of(1, 5, 7, 9).contains(gInBride) ? 1 : 0) + (Set.of(1, 5, 7, 9).contains(bInGroom) ? 1 : 0);
    out.add(rule("Lagna Lord ↔ Lagna Lord synastry", friends + placements, 5,
        "Shows whether the partners' basic drives and ways of approaching life cooperate.",
        List.of("Groom Lagna lord " + groomLord + " falls in Bride H" + gInBride + ".",
            "Bride Lagna lord " + brideLord + " falls in Groom H" + bInGroom + ".",
            "Their sign-lord relationship is " + friendship(brideLord, groomLord) + "; the planets are " + signRelation + " signs apart.")));
  }

  private static void addSeventhLord(List<RuleResult> out, String sourceName, ChartResponse source,
                                    String targetName, ChartResponse target) {
    String seventhLord = lord(signAtHouse(source.ascendant().signNumber(), 7));
    Position p = find(source, seventhLord);
    int houseFromAsc = houseFrom(target.ascendant(), p);
    int houseFromSeventh = houseFrom(find(target, lord(signAtHouse(target.ascendant().signNumber(), 7))), p);
    directHighlight(out, seventhLord + " (7th lord) → " + targetName + " Ascendant", Set.of(1, 5, 7, 9, 10, 11).contains(houseFromAsc) ? 5 : 0, 5,
        "Your partner's marriage ruler landing in your rising-sign area can make the relationship central.",
        sourceName + " 7th lord " + seventhLord + " falls in " + targetName + " H" + houseFromAsc + ".");
    directHighlight(out, seventhLord + " (7th lord) → " + targetName + " 7th", houseFromSeventh == 1 ? 5 : 0, 5,
        "Your partner's marriage ruler activates your partnership house.",
        sourceName + " 7th lord " + seventhLord + " falls in " + targetName + "'s 7th-house sign (relative H" + houseFromSeventh + ").");
  }

  private static boolean hemmed(ChartResponse chart, int pointSign) {
    int previous = signAtHouse(pointSign, 12), next = signAtHouse(pointSign, 2);
    return occupantsBySign(chart, previous).stream().anyMatch(p -> MALefics.contains(p.name()))
        && occupantsBySign(chart, next).stream().anyMatch(p -> MALefics.contains(p.name()));
  }

  private static boolean hasDustLordImpact(ChartResponse chart, int house) {
    int target = signAtHouse(chart.ascendant().signNumber(), house);
    for (int dust : List.of(6, 8, 12)) {
      Position lordPosition = find(chart, lord(signAtHouse(chart.ascendant().signNumber(), dust)));
      if (lordPosition.signNumber() == target || aspectsHouse(chart, lordPosition.name(), target)) return true;
    }
    return false;
  }

  private static boolean isAfflictedByMalefics(ChartResponse chart, Position target) {
    return chart.planets().stream().filter(p -> MALefics.contains(p.name()))
        .anyMatch(p -> p.signNumber() == target.signNumber() || aspectsHouse(chart, p.name(), target.signNumber()));
  }

  private static boolean aspectsHouse(ChartResponse chart, String planet, int targetSign) {
    Position p = find(chart, planet);
    return aspectDistances(planet).contains(rel(p.signNumber(), targetSign));
  }

  private static List<Position> occupantsBySign(ChartResponse chart, int sign) {
    return chart.planets().stream().filter(p -> p.signNumber() == sign).toList();
  }

  private static String occupants(ChartResponse chart, int sign) {
    List<String> names = occupantsBySign(chart, sign).stream().map(Position::name).toList();
    return names.isEmpty() ? "none" : String.join(", ", names);
  }

  private static List<Integer> aspectHouses(String planet, int fromHouse) {
    List<Integer> houses = new ArrayList<>(List.of(Math.floorMod(fromHouse + 5, 12) + 1));
    if (planet.equals("Mars")) { houses.add(Math.floorMod(fromHouse + 2, 12) + 1); houses.add(Math.floorMod(fromHouse + 6, 12) + 1); }
    if (planet.equals("Jupiter")) { houses.add(Math.floorMod(fromHouse + 3, 12) + 1); houses.add(Math.floorMod(fromHouse + 7, 12) + 1); }
    if (planet.equals("Saturn")) { houses.add(Math.floorMod(fromHouse + 1, 12) + 1); houses.add(Math.floorMod(fromHouse + 8, 12) + 1); }
    return houses;
  }

  private static List<Integer> aspectDistances(String planet) {
    List<Integer> houses = new ArrayList<>(List.of(7));
    if (planet.equals("Mars")) { houses.add(4); houses.add(8); }
    if (planet.equals("Jupiter")) { houses.add(5); houses.add(9); }
    if (planet.equals("Saturn")) { houses.add(3); houses.add(10); }
    return houses;
  }

  private static boolean aspectsSign(ChartResponse chart, String planet, int targetSign) {
    return aspectsHouse(chart, planet, targetSign);
  }

  private static int signAtHouse(int ascSign, int house) { return Math.floorMod(ascSign - 1 + house - 1, 12) + 1; }
}
