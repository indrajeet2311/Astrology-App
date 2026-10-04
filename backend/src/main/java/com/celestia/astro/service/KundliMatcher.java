package com.celestia.astro.service;

import com.celestia.astro.model.KundliMatchResponse.KootaScore;
import com.celestia.astro.model.KundliMatchResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Traditional Ashtakoota Guna Milan calculated from the two Moon positions. */
@Service
public class KundliMatcher {
  private static final double MAX_SCORE = 36.0;
  private static final int[] NAKSHATRA_GANA = {
      0, 1, 2, 1, 0, 2, 0, 0, 2, 2, 1, 1, 0, 2, 0, 1, 0, 2, 2, 1, 1, 0, 2, 0, 2, 1, 0};
  private static final String[] GANA_NAMES = {"Deva", "Manushya", "Rakshasa"};
  private static final String[] YONI = {
      "Horse", "Elephant", "Sheep", "Serpent", "Serpent", "Dog", "Cat", "Sheep", "Cat", "Rat", "Rat",
      "Cow", "Buffalo", "Tiger", "Buffalo", "Tiger", "Deer", "Deer", "Dog", "Monkey", "Mongoose",
      "Monkey", "Lion", "Horse", "Lion", "Cow", "Elephant"};
  private static final Set<String> ENEMY_YONI_PAIRS = Set.of(
      pair("Horse", "Buffalo"), pair("Elephant", "Lion"), pair("Sheep", "Monkey"),
      pair("Serpent", "Mongoose"), pair("Dog", "Deer"), pair("Cat", "Rat"), pair("Cow", "Tiger"));
  private static final int[][] VASHYA_POINTS = {
      {2, 1, 1, 1, 0},
      {1, 2, 1, 1, 0},
      {1, 1, 2, 0, 1},
      {1, 1, 0, 2, 0},
      {0, 0, 1, 0, 2}};
  private static final Map<String, Set<String>> FRIENDS = Map.of(
      "Sun", Set.of("Moon", "Mars", "Jupiter"),
      "Moon", Set.of("Sun", "Mercury"),
      "Mars", Set.of("Sun", "Moon", "Jupiter"),
      "Mercury", Set.of("Sun", "Venus"),
      "Jupiter", Set.of("Sun", "Moon", "Mars"),
      "Venus", Set.of("Mercury", "Saturn"),
      "Saturn", Set.of("Mercury", "Venus"));
  private static final Map<String, Set<String>> ENEMIES = Map.of(
      "Sun", Set.of("Venus", "Saturn"),
      "Moon", Set.of(),
      "Mars", Set.of("Mercury"),
      "Mercury", Set.of("Moon"),
      "Jupiter", Set.of("Mercury", "Venus"),
      "Venus", Set.of("Sun", "Moon"),
      "Saturn", Set.of("Sun", "Moon", "Mars"));

  public KundliMatchResponse match(double brideMoonLongitude, double groomMoonLongitude) {
    int brideSign = AstroMath.sign(brideMoonLongitude);
    int groomSign = AstroMath.sign(groomMoonLongitude);
    int brideNakshatra = AstroMath.nakshatraIndex(brideMoonLongitude);
    int groomNakshatra = AstroMath.nakshatraIndex(groomMoonLongitude);
    List<KootaScore> kootas = new ArrayList<>();

    double varna = varna(brideSign, groomSign);
    kootas.add(new KootaScore("Varna", varna, 1, "Moon-sign social class compatibility."));

    double vashya = VASHYA_POINTS[vashyaClass(brideSign, brideMoonLongitude)]
        [vashyaClass(groomSign, groomMoonLongitude)];
    kootas.add(new KootaScore("Vashya", vashya, 2, "Mutual influence based on Moon-sign groups."));

    double tara = tara(brideNakshatra, groomNakshatra);
    kootas.add(new KootaScore("Tara", tara, 3, "Birth-star compatibility in both directions."));

    double yoni = yoni(brideNakshatra, groomNakshatra);
    kootas.add(new KootaScore("Yoni", yoni, 4, "Nakshatra animal compatibility."));

    double grahaMaitri = grahaMaitri(brideSign, groomSign);
    kootas.add(new KootaScore("Graha Maitri", grahaMaitri, 5, "Friendship between the Moon-sign rulers."));

    double gana = gana(brideNakshatra, groomNakshatra);
    kootas.add(new KootaScore("Gana", gana, 6, "Temperament compatibility by birth star."));

    double bhakoot = bhakoot(brideSign, groomSign);
    kootas.add(new KootaScore("Bhakoot", bhakoot, 7, "Moon-sign relationship."));

    double nadi = nadi(brideNakshatra, groomNakshatra);
    kootas.add(new KootaScore("Nadi", nadi, 8, "Nadi compatibility by birth star."));

    double total = kootas.stream().mapToDouble(KootaScore::score).sum();
    List<String> notes = new ArrayList<>();
    if (bhakoot == 0) notes.add("Bhakoot Dosha is indicated by the Moon-sign relationship.");
    if (nadi == 0) notes.add("Nadi Dosha is indicated because both stars are in the same Nadi group.");
    if (total < 18) notes.add("The score is below 18 of 36, a commonly used traditional threshold.");
    else notes.add("The score is at or above 18 of 36, a commonly used traditional threshold.");
    notes.add("This is a traditional screening method; regional rules, exceptions and practitioner interpretation vary.");

    return new KundliMatchResponse(total, MAX_SCORE, AstroMath.signName(brideSign),
        AstroMath.signName(groomSign), List.copyOf(kootas), List.copyOf(notes));
  }

  private static double varna(int brideSign, int groomSign) {
    return varnaRank(groomSign) >= varnaRank(brideSign) ? 1 : 0;
  }

  private static int varnaRank(int sign) {
    return switch (sign % 4) { case 0 -> 3; case 1 -> 2; case 2 -> 1; default -> 4; };
  }

  private static int vashyaClass(int sign, double longitude) {
    double degree = AstroMath.norm(longitude) - sign * 30.0;
    return switch (sign) {
      case 0, 1 -> 0;
      case 2, 5, 6, 10 -> 1;
      case 3, 11 -> 2;
      case 4 -> 3;
      case 7 -> 4;
      case 8 -> degree < 15 ? 1 : 0;
      case 9 -> degree < 15 ? 0 : 2;
      default -> throw new IllegalArgumentException("Invalid Moon sign index.");
    };
  }

  private static double tara(int brideNakshatra, int groomNakshatra) {
    return (taraDirection(brideNakshatra, groomNakshatra) ? 1.5 : 0)
        + (taraDirection(groomNakshatra, brideNakshatra) ? 1.5 : 0);
  }

  private static boolean taraDirection(int from, int to) {
    int count = Math.floorMod(to - from, 27) + 1;
    int remainder = count % 9;
    return remainder == 0 || remainder == 2 || remainder == 4 || remainder == 6 || remainder == 8;
  }

  private static double yoni(int brideNakshatra, int groomNakshatra) {
    String bride = YONI[brideNakshatra];
    String groom = YONI[groomNakshatra];
    if (bride.equals(groom)) return 4;
    return ENEMY_YONI_PAIRS.contains(pair(bride, groom)) ? 0 : 2;
  }

  private static double grahaMaitri(int brideSign, int groomSign) {
    String brideLord = Dignity.signLord(brideSign);
    String groomLord = Dignity.signLord(groomSign);
    if (brideLord.equals(groomLord)) return 5;
    boolean brideFriend = FRIENDS.get(brideLord).contains(groomLord);
    boolean groomFriend = FRIENDS.get(groomLord).contains(brideLord);
    boolean brideEnemy = ENEMIES.get(brideLord).contains(groomLord);
    boolean groomEnemy = ENEMIES.get(groomLord).contains(brideLord);
    if (brideFriend && groomFriend) return 5;
    if (brideEnemy && groomEnemy) return 0;
    if (brideFriend && groomEnemy || brideEnemy && groomFriend) return 1;
    if (brideFriend || groomFriend) return 4;
    if (brideEnemy || groomEnemy) return 0.5;
    return 3;
  }

  private static double gana(int brideNakshatra, int groomNakshatra) {
    int bride = NAKSHATRA_GANA[brideNakshatra];
    int groom = NAKSHATRA_GANA[groomNakshatra];
    if (bride == groom) return 6;
    if (Math.min(bride, groom) == 0 && Math.max(bride, groom) == 1) return 5;
    if (Math.min(bride, groom) == 0) return 1;
    return 0;
  }

  private static double bhakoot(int brideSign, int groomSign) {
    int distance = Math.floorMod(groomSign - brideSign, 12);
    return Set.of(1, 11, 4, 8, 5, 7).contains(distance) ? 0 : 7;
  }

  private static double nadi(int brideNakshatra, int groomNakshatra) {
    return brideNakshatra % 3 == groomNakshatra % 3 ? 0 : 8;
  }

  private static String pair(String first, String second) {
    return first.compareTo(second) < 0 ? first + "/" + second : second + "/" + first;
  }
}