package com.celestia.astro.model;

import java.util.List;

public record KundliMatchResponse(double score, double maxScore, String brideMoonSign, String groomMoonSign,
                                  List<KootaScore> kootas, List<String> notes, ManglikMatch manglik,
                                  List<String> remedies, String summary, Compatibility compatibility) {
  public record KootaScore(String name, double score, double maxScore, String detail) {}

  public record RuleResult(String name, boolean matched, double points, double maxPoints,
                           String reason, List<String> evidence) {}

  public record LayerScore(String name, double points, double maxPoints, List<RuleResult> rules) {}

  public record HouseConnection(int house, List<Integer> groom, List<Integer> bride,
                                List<Integer> overlap, boolean matched) {}

  public record Compatibility(LayerScore otherVedic, LayerScore chanceOfMarriage,
                              List<RuleResult> directSynastry, List<RuleResult> marriageSynastry,
                              List<HouseConnection> connectionSets, List<String> notes) {}

  /** Mangal dosha of one chart; level is None, Low, Medium, High or Cancelled. */
  public record Manglik(boolean present, String level, List<String> factors, List<String> cancellations) {}

  public record ManglikMatch(Manglik bride, Manglik groom, boolean balanced, String verdict) {}

  public KundliMatchResponse withNotes(List<String> newNotes) {
    return new KundliMatchResponse(score, maxScore, brideMoonSign, groomMoonSign, kootas, newNotes, manglik,
        remedies, summary, compatibility);
  }

  public KundliMatchResponse withExtras(ManglikMatch manglik, List<String> remedies, String summary) {
    return new KundliMatchResponse(score, maxScore, brideMoonSign, groomMoonSign, kootas, notes, manglik,
        remedies, summary, compatibility);
  }

  public KundliMatchResponse withCompatibility(Compatibility value) {
    return new KundliMatchResponse(score, maxScore, brideMoonSign, groomMoonSign, kootas, notes, manglik,
        remedies, summary, value);
  }
}