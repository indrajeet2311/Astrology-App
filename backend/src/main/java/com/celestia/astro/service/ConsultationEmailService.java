package com.celestia.astro.service;

import com.celestia.astro.model.ChartLeadRequest;
import com.celestia.astro.model.ConsultationRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class ConsultationEmailService {
  private static final Logger log = LoggerFactory.getLogger(ConsultationEmailService.class);
  private static final String RECIPIENT = "ibtnextgen@gmail.com";

  private final RestClient resendClient;
  private final String fromAddress;

  public ConsultationEmailService(@Value("${celestia.email.resend-api-key:}") String apiKey,
                                  @Value("${celestia.email.resend-from:}") String fromAddress) {
    this.resendClient = StringUtils.hasText(apiKey)
        ? RestClient.builder().baseUrl("https://api.resend.com")
            .defaultHeader("Authorization", "Bearer " + apiKey).build()
        : null;
    this.fromAddress = fromAddress;
  }

  public void send(ConsultationRequest request) {
    if (resendClient == null || !StringUtils.hasText(fromAddress)) {
      throw new ConsultationDeliveryException("Consultation email delivery is not configured.");
    }

    try {
      resendClient.post().uri("/emails")
          .body(Map.of(
              "from", fromAddress,
              "to", List.of(RECIPIENT),
              "reply_to", request.email(),
              "subject", "Private consultation request: " + request.topic(),
              "text", body(request)))
          .retrieve().toBodilessEntity();
    } catch (RestClientException e) {
      throw new ConsultationDeliveryException("The consultation request could not be delivered.", e);
    }
  }

  /**
   * Best-effort notification sent whenever a visitor generates a chart. Unlike {@link #send},
   * failures (missing config, network issues) are only logged, never thrown — a chart lead
   * email is a nice-to-have and must never block or fail the chart calculation itself.
   */
  public void sendChartLead(ChartLeadRequest lead) {
    if (resendClient == null || !StringUtils.hasText(fromAddress)) {
      log.debug("Chart lead email skipped: email delivery is not configured.");
      return;
    }
    try {
      resendClient.post().uri("/emails")
          .body(Map.of(
              "from", fromAddress,
              "to", List.of(RECIPIENT),
              "subject", "New chart generated on NextGenAstro",
              "text", chartLeadBody(lead)))
          .retrieve().toBodilessEntity();
    } catch (RestClientException e) {
      log.warn("Chart lead email delivery failed", e);
    }
  }

  private static String chartLeadBody(ChartLeadRequest lead) {
    return "A visitor just generated a birth chart on NextGenAstro.\n\n"
        + "Name: " + (StringUtils.hasText(lead.name()) ? lead.name() : "Not provided") + '\n'
        + "Date of birth: " + lead.date() + '\n'
        + "Time of birth: " + lead.time() + '\n'
        + "Birthplace: " + lead.placeName() + '\n'
        + "Timezone: " + (StringUtils.hasText(lead.timeZone()) ? lead.timeZone() : "Unknown");
  }

  private static String body(ConsultationRequest request) {
    StringBuilder text = new StringBuilder()
        .append("Private astrologer consultation request\n\n")
        .append("Name: ").append(request.name()).append('\n')
        .append("Email: ").append(request.email()).append('\n')
        .append("Phone: ").append(StringUtils.hasText(request.phone()) ? request.phone() : "Not provided").append('\n')
        .append("Preferred contact: ").append(request.contactMethod()).append('\n')
        .append("Guidance area: ").append(request.topic()).append('\n')
        .append("Timezone: ").append(request.timezone()).append('\n')
        .append("Availability: ").append(StringUtils.hasText(request.availability()) ? request.availability() : "To be arranged").append("\n\n")
        .append("Question / context:\n").append(request.question());
    if (request.shareBirthDetails() && StringUtils.hasText(request.birthDate())) {
      text.append("\n\nBirth chart: ").append(request.birthDate()).append(' ')
          .append(request.birthTime()).append(", ").append(request.birthPlace());
    }
    return text.toString();
  }
}