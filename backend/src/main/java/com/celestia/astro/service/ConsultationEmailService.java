package com.celestia.astro.service;

import com.celestia.astro.model.ChartLeadRequest;
import com.celestia.astro.model.ConsultationRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.io.IOException;
import java.net.URI;

@Service
public class ConsultationEmailService {
  private static final Logger log = LoggerFactory.getLogger(ConsultationEmailService.class);
  // Create the HTTP client only when delivery is actually configured and used.
  // This keeps the application able to start when local email delivery is disabled.
  private RestClient http;
  private final ObjectMapper json = new ObjectMapper();
  private final String appsScriptUrl;
  private final String token;

  public ConsultationEmailService(@Value("${celestia.email.apps-script-url:}") String appsScriptUrl,
                                  @Value("${celestia.email.apps-script-token:}") String token) {
    this.appsScriptUrl = appsScriptUrl;
    this.token = token;
  }

  public void send(ConsultationRequest request) {
    requireConfigured();
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("token", token);
    payload.put("type", "consultation");
    payload.put("name", request.name());
    payload.put("email", request.email());
    payload.put("phone", request.phone());
    payload.put("contactMethod", request.contactMethod());
    payload.put("topic", request.topic());
    payload.put("question", request.question());
    payload.put("availability", request.availability());
    payload.put("timezone", request.timezone());
    payload.put("shareBirthDetails", request.shareBirthDetails());
    payload.put("birthDate", request.birthDate());
    payload.put("birthTime", request.birthTime());
    payload.put("birthPlace", request.birthPlace());
    post(payload, "consultation request");
  }

  /** Best effort notification; chart generation must not depend on email delivery. */
  public void sendChartLead(ChartLeadRequest lead) {
    if (!configured()) {
      log.debug("Chart lead email skipped: Apps Script delivery is not configured.");
      return;
    }
    Map<String, Object> payload = new LinkedHashMap<>();
    payload.put("token", token);
    payload.put("type", "chartLead");
    payload.put("name", lead.name());
    payload.put("date", lead.date());
    payload.put("time", lead.time());
    payload.put("placeName", lead.placeName());
    payload.put("timeZone", lead.timeZone());
    try {
      post(payload, "chart lead");
    } catch (ConsultationDeliveryException e) {
      log.warn("Chart lead email delivery failed", e);
    }
  }

  private void requireConfigured() {
    if (!configured()) {
      throw new ConsultationDeliveryException("Consultation email delivery is not configured. Set GOOGLE_APPS_SCRIPT_URL.");
    }
  }

  private boolean configured() {
    return StringUtils.hasText(appsScriptUrl);
  }

  private void post(Map<String, Object> payload, String description) {
    try {
      RestClient client = client();
      URI uri = URI.create(appsScriptUrl);
      ResponseEntity<String> response = client.post().uri(uri).contentType(MediaType.APPLICATION_JSON).body(payload)
          .exchange((request, reply) -> ResponseEntity.status(reply.getStatusCode()).headers(reply.getHeaders()).body(reply.bodyTo(String.class)));
      // Apps Script redirects to the GET-only ContentService result after executing doPost.
      for (int redirects = 0; redirects < 3 && (response.getStatusCode().value() == 302 || response.getStatusCode().value() == 303); redirects++) {
        URI location = response.getHeaders().getLocation();
        if (location == null) throw new ConsultationDeliveryException("The " + description + " returned a redirect without a result URL.");
        uri = uri.resolve(location);
        response = client.get().uri(uri).exchange((request, reply) -> ResponseEntity.status(reply.getStatusCode()).headers(reply.getHeaders()).body(reply.bodyTo(String.class)));
      }
      if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
        throw new ConsultationDeliveryException("The " + description + " did not return a successful delivery acknowledgment.");
      }
      JsonNode acknowledgment = json.readTree(response.getBody());
      if (acknowledgment == null || !"success".equals(acknowledgment.path("status").asText())) {
        throw new ConsultationDeliveryException("The " + description + " was not accepted by the email service.");
      }
    } catch (RestClientException | IOException | IllegalArgumentException e) {
      throw new ConsultationDeliveryException("The " + description + " could not be delivered.", e);
    }
  }

  private synchronized RestClient client() {
    if (http == null) {
      SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
      factory.setConnectTimeout(10_000);
      factory.setReadTimeout(30_000);
      http = RestClient.builder().requestFactory(factory).build();
    }
    return http;
  }
}
