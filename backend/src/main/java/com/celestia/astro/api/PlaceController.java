package com.celestia.astro.api;

import com.celestia.astro.model.PlaceResult;
import com.celestia.astro.service.PlaceSearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/places")
public class PlaceController {
  private final PlaceSearchService service;

  public PlaceController(PlaceSearchService service) {
    this.service = service;
  }

  @GetMapping
  public List<PlaceResult> search(@RequestParam String q) {
    return service.search(q);
  }
}
