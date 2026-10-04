package com.celestia.astro.api;

import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.PanchangRequest;
import com.celestia.astro.service.SwissEphemerisCalculator;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/panchang")
public class PanchangController {
  private final SwissEphemerisCalculator calculator;

  public PanchangController(SwissEphemerisCalculator calculator) {
    this.calculator = calculator;
  }

  @PostMapping
  public ChartResponse.DailyPanchang panchang(@Valid @RequestBody PanchangRequest request) {
    return calculator.calculatePanchang(request.date(), request.placeName(), request.latitude(), request.longitude(),
        request.timeZone(), request.ayanamsa());
  }
}