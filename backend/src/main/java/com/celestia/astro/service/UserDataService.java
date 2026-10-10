package com.celestia.astro.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;

@Service
public class UserDataService {
  private static final String ADMIN_EMAIL = "indrajeetbhattacharya5@gmail.com";
  private static final long SESSION_LIFETIME_MS = 30L * 24 * 60 * 60 * 1000;
  private static final SecureRandom RANDOM = new SecureRandom();
  private final ObjectMapper json;
  private final Path dataDir;
  private final String adminPasskey;

  public UserDataService(ObjectMapper json,
                         @Value("${celestia.data-dir:./data}") String dataDir,
                         @Value("${ADMIN_PASSKEY:}") String adminPasskey) {
    this.json = json;
    this.dataDir = Path.of(dataDir).toAbsolutePath().normalize();
    this.adminPasskey = adminPasskey;
    initialize();
  }

  private void initialize() {
    try {
      Files.createDirectories(dataDir);
      for (String file : List.of("users.json", "sessions.json", "user_charts.json", "consultations.json")) {
        Path path = dataDir.resolve(file);
        if (!Files.exists(path)) Files.writeString(path, file.equals("sessions.json") ? "{}" : "[]", StandardCharsets.UTF_8);
      }
    } catch (Exception e) {
      throw new IllegalStateException("Could not initialize user data storage.", e);
    }
  }

  private synchronized <T> T read(String file, TypeReference<T> type, T fallback) {
    try { return json.readValue(dataDir.resolve(file).toFile(), type); }
    catch (Exception e) { return fallback; }
  }

  private synchronized void write(String file, Object value) {
    try {
      Path target = dataDir.resolve(file);
      Path temp = dataDir.resolve(file + ".tmp");
      json.writerWithDefaultPrettyPrinter().writeValue(temp.toFile(), value);
      try { Files.move(temp, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE); }
      catch (java.nio.file.AtomicMoveNotSupportedException e) { Files.move(temp, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING); }
    } catch (Exception e) { throw new IllegalStateException("Could not save user data.", e); }
  }

  private List<Map<String, Object>> users() { return read("users.json", new TypeReference<>() {}, new ArrayList<>()); }
  private List<Map<String, Object>> charts() { return read("user_charts.json", new TypeReference<>() {}, new ArrayList<>()); }
  private Map<String, Map<String, Object>> sessions() { return read("sessions.json", new TypeReference<>() {}, new LinkedHashMap<>()); }
  private List<Map<String, Object>> consultations() { return read("consultations.json", new TypeReference<>() {}, new ArrayList<>()); }

  public synchronized Map<String, Object> register(String name, String email, String password) {
    String cleanEmail = cleanEmail(email);
    if (name == null || name.isBlank() || password == null || password.length() < 8) throw new IllegalArgumentException("Enter your name and a password with at least 8 characters.");
    List<Map<String, Object>> users = users();
    if (users.stream().anyMatch(u -> cleanEmail.equals(u.get("email")))) throw new IllegalArgumentException("An account with this email address already exists.");
    String salt = randomHex(16);
    String role = "client";
    Map<String, Object> user = new LinkedHashMap<>();
    user.put("id", "usr_" + randomHex(8)); user.put("name", name.trim()); user.put("email", cleanEmail); user.put("role", role);
    user.put("salt", salt); user.put("hash", hash(password, salt)); user.put("createdAt", Instant.now().toString());
    users.add(user); write("users.json", users);
    return loginResponse(user);
  }

  public synchronized Map<String, Object> login(String email, String password) {
    String cleanEmail = cleanEmail(email);
    Map<String, Object> user = users().stream().filter(u -> cleanEmail.equals(u.get("email"))).findFirst().orElse(null);
    if (user == null || !MessageDigest.isEqual(String.valueOf(user.get("hash")).getBytes(StandardCharsets.UTF_8), hash(password, String.valueOf(user.get("salt"))).getBytes(StandardCharsets.UTF_8))) {
      throw new IllegalArgumentException("Invalid email or password.");
    }
    return loginResponse(user);
  }

  public synchronized Map<String, Object> adminLogin(String passkey) {
    if (adminPasskey.isBlank()) throw new IllegalArgumentException("Admin access is not configured. Set ADMIN_PASSKEY in Render environment variables.");
    if (passkey == null || !MessageDigest.isEqual(adminPasskey.getBytes(StandardCharsets.UTF_8), passkey.getBytes(StandardCharsets.UTF_8))) throw new IllegalArgumentException("Invalid Admin Passkey.");
    Map<String, Object> admin = new LinkedHashMap<>();
    admin.put("id", "usr_admin_astro"); admin.put("name", "Astrologer Admin"); admin.put("email", ADMIN_EMAIL); admin.put("role", "admin");
    return loginResponse(admin);
  }

  private Map<String, Object> loginResponse(Map<String, Object> user) {
    String token = "na_" + randomHex(24);
    Map<String, Object> session = new LinkedHashMap<>();
    session.put("userId", user.get("id")); session.put("name", user.get("name")); session.put("email", user.get("email"));
    session.put("role", user.get("role")); session.put("createdAt", System.currentTimeMillis());
    Map<String, Map<String, Object>> sessions = sessions(); sessions.put(token, session); write("sessions.json", sessions);
    return Map.of("success", true, "user", publicUser(user), "token", token);
  }

  public synchronized Map<String, Object> currentUser(String token) {
    Map<String, Object> session = session(token);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("user", session == null ? null : sessionUser(session));
    return result;
  }

  public synchronized void logout(String token) { if (token != null) { Map<String, Map<String, Object>> sessions = sessions(); sessions.remove(token); write("sessions.json", sessions); } }

  private Map<String, Object> session(String token) {
    if (token == null || token.isBlank()) return null;
    Map<String, Map<String, Object>> sessions = sessions();
    Map<String, Object> session = sessions.get(token);
    if (session == null) return null;
    Object created = session.get("createdAt");
    if (!(created instanceof Number n) || System.currentTimeMillis() - n.longValue() > SESSION_LIFETIME_MS) { sessions.remove(token); write("sessions.json", sessions); return null; }
    return session;
  }

  public Map<String, Object> requireUser(String token) {
    Map<String, Object> user = session(token);
    if (user == null) throw new IllegalArgumentException("Please sign in to continue.");
    return user;
  }

  public Map<String, Object> requireAdmin(String token) {
    Map<String, Object> user = requireUser(token);
    if (!"admin".equals(user.get("role"))) throw new IllegalArgumentException("Administrator access is required.");
    return user;
  }

  public synchronized List<Map<String, Object>> getCharts(String token) {
    String userId = String.valueOf(requireUser(token).get("userId"));
    return charts().stream().filter(c -> userId.equals(c.get("userId"))).toList();
  }

  public synchronized Map<String, Object> saveChart(String token, JsonNode body) {
    String userId = String.valueOf(requireUser(token).get("userId"));
    JsonNode payload = body.get("payload");
    if (payload == null || payload.isNull() || !payload.hasNonNull("date")) throw new IllegalArgumentException("A valid chart is required.");
    Map<String, Object> chart = new LinkedHashMap<>();
    chart.put("id", "ch_" + randomHex(8)); chart.put("userId", userId);
    chart.put("label", text(body, "label", payload.path("name").asText(payload.path("placeName").asText("Saved Chart"))));
    chart.put("relationship", text(body, "relationship", "self")); chart.put("notes", text(body, "notes", ""));
    chart.put("savedAt", Instant.now().toString()); chart.put("payload", json.convertValue(payload, Object.class));
    List<Map<String, Object>> charts = charts(); charts.add(0, chart); write("user_charts.json", charts); return chart;
  }

  public synchronized boolean deleteChart(String token, String id) {
    String userId = String.valueOf(requireUser(token).get("userId")); List<Map<String, Object>> charts = charts();
    boolean changed = charts.removeIf(c -> id.equals(c.get("id")) && userId.equals(c.get("userId")));
    if (changed) write("user_charts.json", charts); return changed;
  }

  public synchronized Map<String, Object> updateChart(String token, String id, JsonNode updates) {
    String userId = String.valueOf(requireUser(token).get("userId")); List<Map<String, Object>> charts = charts();
    for (Map<String, Object> chart : charts) if (id.equals(chart.get("id")) && userId.equals(chart.get("userId"))) {
      for (String field : List.of("label", "relationship", "notes")) if (updates.has(field)) chart.put(field, updates.path(field).asText(""));
      write("user_charts.json", charts); return chart;
    }
    throw new IllegalArgumentException("Saved chart not found.");
  }

  public synchronized List<Map<String, Object>> syncCharts(String token, JsonNode body) {
    String userId = String.valueOf(requireUser(token).get("userId")); JsonNode items = body.path("localCharts");
    if (items.isArray()) for (JsonNode item : items) {
      JsonNode payload = item.path("payload"); if (payload.isMissingNode() || !payload.hasNonNull("date")) continue;
      boolean exists = getCharts(token).stream().anyMatch(c -> {
        JsonNode p = json.valueToTree(c.get("payload"));
        return p.path("date").equals(payload.path("date")) && p.path("time").equals(payload.path("time"))
            && p.path("name").equals(payload.path("name")) && p.path("placeName").equals(payload.path("placeName"));
      });
      if (!exists) { ObjectNodeBuilder bodyBuilder = new ObjectNodeBuilder(json); saveChart(token, bodyBuilder.make(payload, item)); }
    }
    return getCharts(token);
  }

  public synchronized List<Map<String, Object>> getConsultations(String token, boolean admin) {
    Map<String, Object> user = admin ? requireAdmin(token) : requireUser(token);
    return admin ? consultations() : consultations().stream().filter(c -> cleanEmail(String.valueOf(c.get("email"))).equals(user.get("email"))).toList();
  }

  public synchronized Map<String, Object> addConsultation(Map<String, Object> item) {
    List<Map<String, Object>> items = consultations();
    String date = Instant.now().toString().substring(0, 10).replace("-", "");
    item.put("id", "CR-" + date + "-" + String.format("%04d", RANDOM.nextInt(9000) + 1000));
    item.put("createdAt", Instant.now().toString()); item.put("status", "pending");
    items.add(0, item); write("consultations.json", items); return item;
  }

  public synchronized Map<String, Object> updateConsultation(String token, String id, JsonNode updates) {
    requireAdmin(token);
    List<Map<String, Object>> items = consultations();
    for (Map<String, Object> item : items) if (id.equals(item.get("id"))) {
      String status = updates.path("status").asText();
      if (Set.of("pending", "contacted", "completed").contains(status)) item.put("status", status);
      if (updates.has("notes")) item.put("notes", updates.path("notes").asText(""));
      write("consultations.json", items); return item;
    }
    throw new IllegalArgumentException("Consultation not found.");
  }

  public synchronized boolean deleteConsultation(String token, String id) {
    requireAdmin(token); List<Map<String, Object>> items = consultations(); boolean changed = items.removeIf(item -> id.equals(item.get("id")));
    if (changed) write("consultations.json", items); return changed;
  }

  private Map<String, Object> sessionUser(Map<String, Object> session) { return Map.of("id", session.get("userId"), "name", session.get("name"), "email", session.get("email"), "role", session.get("role")); }
  private Map<String, Object> publicUser(Map<String, Object> user) { return Map.of("id", user.get("id"), "name", user.get("name"), "email", user.get("email"), "role", user.get("role")); }
  private static String cleanEmail(String email) { return email == null ? "" : email.trim().toLowerCase(Locale.ROOT); }
  private static String randomHex(int bytes) { byte[] value = new byte[bytes]; RANDOM.nextBytes(value); return HexFormat.of().formatHex(value); }
  private static String hash(String password, String salt) {
    try { PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), HexFormat.of().parseHex(salt), 210_000, 256); return HexFormat.of().formatHex(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded()); }
    catch (Exception e) { throw new IllegalStateException("Could not secure account password.", e); }
  }
  private static String text(JsonNode node, String field, String fallback) { String value = node.path(field).asText("").trim(); return value.isEmpty() ? fallback : value; }

  private record ObjectNodeBuilder(ObjectMapper json) {
    JsonNode make(JsonNode payload, JsonNode item) {
      var node = json.createObjectNode(); node.set("payload", payload); node.put("label", payload.path("name").asText(payload.path("placeName").asText("Saved Chart"))); node.put("relationship", "other");
      if (item.hasNonNull("savedAt")) node.put("savedAt", item.path("savedAt").asText());
      return node;
    }
  }
}
