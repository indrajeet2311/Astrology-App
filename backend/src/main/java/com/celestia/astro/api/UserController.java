package com.celestia.astro.api;

import com.celestia.astro.service.UserDataService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/user")
public class UserController {
  private final UserDataService users;
  public UserController(UserDataService users) { this.users = users; }

  @GetMapping("/charts") public Map<String, Object> charts(HttpServletRequest request) { return Map.of("charts", users.getCharts(AuthController.token(request))); }
  @PostMapping("/charts") public Map<String, Object> save(@RequestBody JsonNode body, HttpServletRequest request) {
    return Map.of("success", true, "chart", users.saveChart(AuthController.token(request), body));
  }
  @DeleteMapping("/charts/{id}") public Map<String, Boolean> delete(@PathVariable String id, HttpServletRequest request) {
    if (!users.deleteChart(AuthController.token(request), id)) throw new IllegalArgumentException("Saved chart not found.");
    return Map.of("success", true);
  }
  @PatchMapping("/charts/{id}") public Map<String, Object> update(@PathVariable String id, @RequestBody JsonNode body, HttpServletRequest request) {
    return users.updateChart(AuthController.token(request), id, body);
  }
  @PostMapping("/charts/sync") public Map<String, Object> sync(@RequestBody JsonNode body, HttpServletRequest request) {
    return Map.of("success", true, "charts", users.syncCharts(AuthController.token(request), body));
  }
  @GetMapping("/consultations") public Map<String, Object> consultations(HttpServletRequest request) {
    return Map.of("consultations", users.getConsultations(AuthController.token(request), false));
  }
}
