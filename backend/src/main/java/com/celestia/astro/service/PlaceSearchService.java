package com.celestia.astro.service;

import com.celestia.astro.model.PlaceResult;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

/** Looks up birthplaces through the Open-Meteo geocoding API, which returns coordinates and an IANA timezone. */
@Service
public class PlaceSearchService {
  private static final int MAX_RESULTS = 8;

  private final String baseUrl;
  private RestClient client;

  public PlaceSearchService(@Value("${celestia.geocoder-url}") String baseUrl) {
    this.baseUrl = baseUrl;
  }

  @JsonIgnoreProperties(ignoreUnknown = true)
  record Response(List<Hit> results) {}

  @JsonIgnoreProperties(ignoreUnknown = true)
  record Hit(String name, String admin1, String country, Double latitude, Double longitude, String timezone) {}

  public List<PlaceResult> search(String query) {
    String q = query == null ? "" : query.trim();
    if (q.length() < 2) return List.of();

    var uri = UriComponentsBuilder.fromUriString(baseUrl)
        .queryParam("name", q)
        .queryParam("count", MAX_RESULTS)
        .queryParam("language", "en")
        .queryParam("format", "json")
        .build().encode().toUri();

    Response response;
    try {
      if (client == null) client = RestClient.builder()
          .requestFactory(new SimpleClientHttpRequestFactory())
          .build();
      response = client.get().uri(uri).retrieve().body(Response.class);
    } catch (RestClientException e) {
      throw new PlaceLookupException("Place search is temporarily unavailable. Please try again.", e);
    }
    if (response == null || response.results() == null) return List.of();

    List<PlaceResult> places = new ArrayList<>();
    for (Hit hit : response.results()) {
      // Never guess a timezone: results without one cannot be used for a chart.
      if (hit.timezone() == null || hit.timezone().isBlank() || hit.latitude() == null || hit.longitude() == null) {
        continue;
      }
      String label = String.join(", ", Stream.of(hit.name(), hit.admin1(), hit.country())
          .filter(s -> s != null && !s.isBlank()).distinct().toList());
      places.add(new PlaceResult(label, hit.latitude(), hit.longitude(), hit.timezone()));
    }
    return places;
  }
}
