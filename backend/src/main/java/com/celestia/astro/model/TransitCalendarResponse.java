package com.celestia.astro.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record TransitCalendarResponse(String from, String to, String natalAscendantSign, String natalMoonSign,
                                      List<CalendarEvent> events, List<MonthSnapshot> months) {
  /** Request: the natal data plus the first day of the 12-month window (today when omitted). */
  public record Request(@Valid @NotNull BirthRequest birth, LocalDate from) {}

  /** type is INGRESS, RETROGRADE, DIRECT, SOLAR_ECLIPSE or LUNAR_ECLIPSE. */
  public record CalendarEvent(String at, String type, String planet, String title, String sign,
                              int house, int moonHouse, String detail) {}

  public record MonthSnapshot(String date, List<Placement> planets) {}

  public record Placement(String name, String sign, int signNumber, int house, int moonHouse, boolean retrograde) {}
}
