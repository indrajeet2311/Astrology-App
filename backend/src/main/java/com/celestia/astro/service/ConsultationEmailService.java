package com.celestia.astro.service;

import com.celestia.astro.model.ConsultationRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ConsultationEmailService {
  private static final String RECIPIENT = "ibtnextgen@gmail.com";

  private final JavaMailSender mailSender;
  private final String smtpHost;
  private final String fromAddress;

  public ConsultationEmailService(JavaMailSender mailSender,
                                  @Value("${spring.mail.host:}") String smtpHost,
                                  @Value("${celestia.mail-from:}") String fromAddress) {
    this.mailSender = mailSender;
    this.smtpHost = smtpHost;
    this.fromAddress = fromAddress;
  }

  public void send(ConsultationRequest request) {
    if (!StringUtils.hasText(smtpHost) || !StringUtils.hasText(fromAddress)) {
      throw new ConsultationDeliveryException("Consultation email delivery is not configured.");
    }

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