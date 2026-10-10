package com.celestia.astro.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * A lightweight, best-effort notification sent when a visitor generates a chart, so the
 * site owner knows who is using the app. Deliberately has no email/phone/validation beyond
 * length limits: it is informational telemetry, not a form the user fills in themselves.
 */
public record ChartLeadRequest(
    @Size(max = 80) String name,
    @NotBlank @Size(max = 10) String date,
    @NotBlank @Size(max = 5) String time,
    @NotBlank @Size(max = 200) String placeName,
    @Size(max = 80) String timeZone) {}
