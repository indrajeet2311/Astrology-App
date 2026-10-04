package com.celestia.astro.api;

import com.celestia.astro.model.BirthRequest;
import com.celestia.astro.model.FestivalCalendarResponse;
import com.celestia.astro.model.SaturnCyclesResponse;
import com.celestia.astro.model.SlowTransitsResponse;
import com.celestia.astro.model.TransitCalendarResponse;
import com.celestia.astro.service.FestivalCalendarService;
import com.celestia.astro.service.TransitCalendarService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TimelineController {
  private final TransitCalendarService transits;
  private final FestivalCalendarService festivals;

  public TimelineController(TransitCalendarService transits, FestivalCalendarService festivals) {
    this.transits = transits;
    this.festivals = festivals;
  }

  @PostMapping("/api/chart/saturn-cycles")
  public SaturnCyclesResponse saturnCycles(@Valid @RequestBody BirthRequest request) {
    return transits.saturnCycles(request);
  }

  @PostMapping("/api/chart/transit-calendar")
  public TransitCalendarResponse transitCalendar(@Valid @RequestBody TransitCalendarResponse.Request request) {
    return transits.calendar(request);
  }

  @PostMapping("/api/chart/slow-transits")
  public SlowTransitsResponse slowTransits(@Valid @RequestBody SlowTransitsResponse.Request request) {
    return transits.slowTransits(request);
  }

  @PostMapping("/api/calendar/festivals")
  public FestivalCalendarResponse festivals(@Valid @RequestBody FestivalCalendarResponse.Request request) {
    return festivals.calendar(request);
  }
}
