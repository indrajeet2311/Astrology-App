package com.celestia.astro.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Sign-by-sign passage of the slow planets over a date range, used to time predictions. */
public record SlowTransitsResponse(String from, String to, List<Track> tracks) {
  public record Request(@Valid @NotNull BirthRequest birth, @NotNull LocalDate from, @NotNull LocalDate to) {}

  /** name is Jupiter, Saturn or Rahu (Ketu is always six signs from Rahu). */
  public record Track(String name, List<Segment> segments) {}

  /** signNumber is 1-12 and nakshatraIndex is zero-based; dates are local to the birth timezone. */
  public record Segment(int signNumber, int nakshatraIndex, String start, String end) {}
}
