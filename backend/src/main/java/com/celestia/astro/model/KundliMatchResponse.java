package com.celestia.astro.model;

import java.util.List;

public record KundliMatchResponse(double score, double maxScore, String brideMoonSign, String groomMoonSign,
                                  List<KootaScore> kootas, List<String> notes) {
  public record KootaScore(String name, double score, double maxScore, String detail) {}
}