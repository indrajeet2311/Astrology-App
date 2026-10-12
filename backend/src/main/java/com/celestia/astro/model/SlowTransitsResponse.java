package com.celestia.astro.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** Sign-by-sign planetary passage over a date range, used to refine topic-specific dasha timing. */
public record SlowTransitsResponse(String from, String to, List<Track> tracks) {
  public record Request(@Valid @NotNull BirthRequest birth, @NotNull LocalDate from, @NotNull LocalDate to) {}

  /** Includes all visible planets and the lunar nodes so dasha-lord transit checks can be evaluated. */
  public record Track(String name, List<Segment> segments) {}

  /** signNumber is 1-12 and nakshatraIndex is zero-based; dates are local to the birth timezone. */
  public record Segment(int signNumber, int nakshatraIndex, String start, String end) {}
}
