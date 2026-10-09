package com.celestia.astro.service;

import com.celestia.astro.model.ChartLeadRequest;
import com.celestia.astro.model.ConsultationRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ConsultationEmailService {
  private static final Logger log = LoggerFactory.getLogger(ConsultationEmailService.class);
  private static final String RECIPIENT = "indrajeetbhattacharya5@gmail.com";

  private final JavaMailSender mailSender;
  private final String fromAddress;

  public ConsultationEmailService(JavaMailSender mailSender,
                                  @Value("${spring.mail.username:}") String fromAddress) {
    this.mailSender = mailSender;
    this.fromAddress = fromAddress;
  }

  public void send(ConsultationRequest request) {
    ensureConfigured();
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(RECIPIENT);
    message.setReplyTo(request.email());
    message.setSubject("Private consultation request: " + request.topic());
    message.setText(body(request));
    try {
      mailSender.send(message);
    } catch (MailException e) {
      throw new ConsultationDeliveryException("The consultation request could not be delivered.", e);
    }
  }

  /** Best effort notification; chart generation must not depend on email delivery. */
  public void sendChartLead(ChartLeadRequest lead) {
    if (!StringUtils.hasText(fromAddress)) {
      log.debug("Chart lead email skipped: SMTP is not configured.");
      return;
    }
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(RECIPIENT);
    message.setSubject("New chart generated on NextGenAstro");
    message.setText(chartLeadBody(lead));
    try {
      mailSender.send(message);
    } catch (MailException e) {
      log.warn("Chart lead email delivery failed", e);
    }
  }

  private void ensureConfigured() {
    if (!StringUtils.hasText(fromAddress)) {
      throw new ConsultationDeliveryException("Consultation email delivery is not configured. Set SMTP_USERNAME and SMTP_PASSWORD.");
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
