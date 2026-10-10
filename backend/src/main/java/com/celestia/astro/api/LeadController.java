package com.celestia.astro.api;

import com.celestia.astro.model.ChartLeadRequest;
import com.celestia.astro.service.ConsultationEmailService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Receives a fire-and-forget notification whenever a visitor generates a chart on the
 * birth-details form. Always responds 202, regardless of whether the email was actually
 * sent — the frontend does not wait for or surface this to the user.
 */
@RestController
@RequestMapping("/api/leads")
public class LeadController {
  private final ConsultationEmailService emailService;

  public LeadController(ConsultationEmailService emailService) {
    this.emailService = emailService;
  }

  @PostMapping("/chart")
  public ResponseEntity<Map<String, String>> chartGenerated(@Valid @RequestBody ChartLeadRequest request) {
    emailService.sendChartLead(request);
    return ResponseEntity.accepted().body(Map.of("message", "Noted."));
  }
}
