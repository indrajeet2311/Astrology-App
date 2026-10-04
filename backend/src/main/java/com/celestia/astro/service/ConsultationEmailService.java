package com.celestia.astro.service;

import com.celestia.astro.model.ConsultationRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.List;
import java.util.Map;

@Service
public class ConsultationEmailService {
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