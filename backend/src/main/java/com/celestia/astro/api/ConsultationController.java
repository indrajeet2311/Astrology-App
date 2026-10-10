package com.celestia.astro.api;

import com.celestia.astro.model.ConsultationRequest;
import com.celestia.astro.service.ConsultationEmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/consultations")
public class ConsultationController {
  private final ConsultationEmailService emailService;

  public ConsultationController(ConsultationEmailService emailService) {
    this.emailService = emailService;
  }

  @PostMapping
  public ResponseEntity<Map<String, String>> submit(@Valid @RequestBody ConsultationRequest request) {
    if (request.website() != null && !request.website().isBlank()) {
      return ResponseEntity.accepted().body(Map.of("message", "Request received."));
    }
    emailService.send(request);
    return ResponseEntity.ok(Map.of("message", "Your consultation request was sent."));
  }
}