package com.celestia.astro.service;

import com.celestia.astro.model.ChartLeadRequest;
import com.celestia.astro.model.ConsultationRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class ConsultationEmailService {
  private static final Logger log = LoggerFactory.getLogger(ConsultationEmailService.class);
  private final RestClient http = RestClient.create();
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
      throw new ConsultationDeliveryException("Consultation email delivery is not configured. Set GOOGLE_APPS_SCRIPT_URL and GOOGLE_APPS_SCRIPT_TOKEN.");
    }
  }

  private boolean configured() {
    return StringUtils.hasText(appsScriptUrl) && StringUtils.hasText(token);
  }

  private void post(Map<String, Object> payload, String description) {
    try {
      http.post().uri(appsScriptUrl).contentType(MediaType.APPLICATION_JSON).body(payload)
          .retrieve().toBodilessEntity();
    } catch (RestClientException e) {
      throw new ConsultationDeliveryException("The " + description + " could not be delivered.", e);
    }
  }
}
