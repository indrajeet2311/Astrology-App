package com.celestia.astro.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record AnnualChartsRequest(@NotNull @Valid BirthRequest birth,
                                  @NotNull @Min(1800) @Max(2100) Integer year) {}