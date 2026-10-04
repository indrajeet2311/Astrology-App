package com.celestia.astro.api;

import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.service.SwissEphemerisCalculator;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/chart")
public class ChartController {
  private final SwissEphemerisCalculator calculator;

  public ChartController(SwissEphemerisCalculator calculator) {
    this.calculator = calculator;
  }

  @PostMapping
  public ChartResponse chart(@Valid @RequestBody BirthRequest request) {
    return calculator.calculate(request.name(), LocalDateTime.of(request.date(), request.time()),
        request.placeName(), request.latitude(), request.longitude(), request.timeZone(), request.ayanamsa());
  }
}
