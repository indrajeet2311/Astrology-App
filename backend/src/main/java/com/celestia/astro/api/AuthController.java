package com.celestia.astro.api;

import com.celestia.astro.service.UserDataService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserDataService users;
  public AuthController(UserDataService users) { this.users = users; }

  @PostMapping("/register") public Map<String, Object> register(@RequestBody JsonNode body) {
    return users.register(body.path("name").asText(), body.path("email").asText(), body.path("password").asText());
  }
  @PostMapping("/login") public Map<String, Object> login(@RequestBody JsonNode body) {
    return users.login(body.path("email").asText(), body.path("password").asText());
  }
  @PostMapping("/admin-login") public Map<String, Object> adminLogin(@RequestBody JsonNode body) {
    return users.adminLogin(body.path("passkey").asText());
  }
  @GetMapping("/me") public Map<String, Object> me(HttpServletRequest request) { return users.currentUser(token(request)); }
  @PostMapping("/logout") public Map<String, Boolean> logout(HttpServletRequest request) {
    users.logout(token(request)); return Map.of("success", true);
  }
  static String token(HttpServletRequest request) {
    String authorization = request.getHeader("Authorization");
    return authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7).trim() : null;
  }
}
