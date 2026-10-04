package com.celestia.astro.model;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

public record BirthRequest(
    @Size(max = 80) String name,
    @NotNull LocalDate date,
    @NotNull LocalTime time,
    @NotBlank @Size(max = 200) String placeName,
    @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
    @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude,
    @NotBlank String timeZone,
    @NotNull Ayanamsa ayanamsa,
    LocalDate transitDate,
    Boolean trueNode,
    HouseSystem houseSystem,
    Boolean laterOffset) {}
