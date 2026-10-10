package com.celestia.astro.api;

import com.celestia.astro.model.ConsultationRequest;
import com.celestia.astro.service.ConsultationEmailService;
import com.celestia.astro.service.UserDataService;
import jakarta.servlet.http.HttpServletRequest;
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
  private final UserDataService users;
  private final ConsultationEmailService emailService;

  public ConsultationController(UserDataService users, ConsultationEmailService emailService) {
    this.users = users;
    this.emailService = emailService;
  }

  @PostMapping
  public ResponseEntity<Map<String, Object>> submit(@Valid @RequestBody ConsultationRequest request) {
    if (request.website() != null && !request.website().isBlank()) {
      return ResponseEntity.accepted().body(Map.of("message", "Request received."));
    }
    emailService.send(request);
    Map<String, Object> data = new java.util.LinkedHashMap<>();
    data.put("name", request.name()); data.put("email", request.email()); data.put("phone", request.phone());
    data.put("contactMethod", request.contactMethod()); data.put("topic", request.topic()); data.put("question", request.question());
    data.put("availability", request.availability()); data.put("timezone", request.timezone());
    data.put("shareBirthDetails", request.shareBirthDetails()); data.put("birthDate", request.birthDate());
    data.put("birthTime", request.birthTime()); data.put("birthPlace", request.birthPlace());
    Map<String, Object> saved = users.addConsultation(data);
    return ResponseEntity.ok(Map.of("success", true, "id", saved.get("id"), "message", "Your request was emailed to the astrologer and saved.", "consultation", saved));
  }

  @org.springframework.web.bind.annotation.GetMapping
  public Map<String, Object> list(HttpServletRequest request) {
    var items = users.getConsultations(AuthController.token(request), true);
    return Map.of("consultations", items, "count", items.size());
  }

  @org.springframework.web.bind.annotation.PatchMapping("/{id}")
  public Map<String, Object> update(@org.springframework.web.bind.annotation.PathVariable String id,
                                    @RequestBody com.fasterxml.jackson.databind.JsonNode body, HttpServletRequest request) {
    return Map.of("success", true, "consultation", users.updateConsultation(AuthController.token(request), id, body));
  }

  @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
  public Map<String, Boolean> delete(@org.springframework.web.bind.annotation.PathVariable String id, HttpServletRequest request) {
    if (!users.deleteConsultation(AuthController.token(request), id)) throw new IllegalArgumentException("Consultation not found.");
    return Map.of("success", true);
  }
}
