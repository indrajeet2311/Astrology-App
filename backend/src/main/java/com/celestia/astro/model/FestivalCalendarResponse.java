package com.celestia.astro.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record FestivalCalendarResponse(int year, String placeName, List<LunarMonth> months, List<Event> events) {
  public record Request(
      @NotNull @Min(1900) @Max(2100) Integer year,
      @Size(max = 200) String placeName,
      @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
      @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
      @NotBlank String timeZone,
      @NotNull Ayanamsa ayanamsa) {}

  public record LunarMonth(String name, boolean adhika, String start, String end) {}

  /** category is EKADASHI, FESTIVAL, PURNIMA, AMAVASYA, PRADOSH, SANKRANTI or SANKASHTI. */
  public record Event(String date, String category, String name, String detail) {}
}
