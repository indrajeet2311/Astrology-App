package com.celestia.astro.api;

import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.AnnualChartsRequest;
import com.celestia.astro.model.AnnualChartsResponse;
import com.celestia.astro.model.ChartResponse;
import com.celestia.astro.model.KundliMatchRequest;
import com.celestia.astro.model.KundliMatchResponse;
import com.celestia.astro.model.HouseSystem;
import com.celestia.astro.service.KundliMatcher;
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
  private final KundliMatcher kundliMatcher;

  public ChartController(SwissEphemerisCalculator calculator, KundliMatcher kundliMatcher) {
    this.calculator = calculator;
    this.kundliMatcher = kundliMatcher;
  }

  @PostMapping
  public ChartResponse chart(@Valid @RequestBody BirthRequest request) {
    return calculate(request);
  }

  @PostMapping("/annual")
  public AnnualChartsResponse annualCharts(@Valid @RequestBody AnnualChartsRequest request) {
    return calculator.calculateAnnualCharts(request.birth(), request.year());
  }

  @PostMapping("/match")
  public KundliMatchResponse match(@Valid @RequestBody KundliMatchRequest request) {
    ChartResponse bride = calculate(request.bride());
    ChartResponse groom = calculate(request.groom());
    return kundliMatcher.match(bride, groom);
  }

  private ChartResponse calculate(BirthRequest request) {
    return calculator.calculate(request.name(), LocalDateTime.of(request.date(), request.time()),
      request.placeName(), request.latitude(), request.longitude(), request.timeZone(), request.ayanamsa(),
        request.transitDate(), Boolean.TRUE.equals(request.trueNode()),
      request.houseSystem() == null ? HouseSystem.WHOLE_SIGN : request.houseSystem(),
      Boolean.TRUE.equals(request.laterOffset()));
  }
}
