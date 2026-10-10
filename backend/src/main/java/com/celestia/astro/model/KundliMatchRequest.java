package com.celestia.astro.model;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record KundliMatchRequest(@Valid @NotNull BirthRequest bride, @Valid @NotNull BirthRequest groom) {}