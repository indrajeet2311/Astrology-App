package com.celestia.astro.service;

import com.celestia.astro.model.ConsultationRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

class ConsultationEmailServiceTest {
  private HttpServer server;
  private String url;
  private String requestBody;
  private int status;
  private String body;
  private String redirect;
  private final AtomicInteger posts = new AtomicInteger();
  private final AtomicInteger gets = new AtomicInteger();

  @BeforeEach
  void start() throws IOException {
    status = 200;
    body = "{\"status\":\"success\"}";
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext("/exec", exchange -> {
      posts.incrementAndGet();
      requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
      byte[] response = body.getBytes(StandardCharsets.UTF_8);
      exchange.getResponseHeaders().set("Content-Type", "application/json");
      if (redirect != null) exchange.getResponseHeaders().set("Location", redirect);
      exchange.sendResponseHeaders(status, response.length);
      exchange.getResponseBody().write(response);
      exchange.close();
    });
    server.createContext("/result", exchange -> {
      gets.incrementAndGet();
      assertEquals("GET", exchange.getRequestMethod());
      byte[] response = "{\"status\":\"success\"}".getBytes(StandardCharsets.UTF_8);
      exchange.sendResponseHeaders(200, response.length);
      exchange.getResponseBody().write(response);
      exchange.close();
    });
    server.start();
    url = "http://127.0.0.1:" + server.getAddress().getPort() + "/exec";
  }

  @AfterEach
  void stop() {
    server.stop(0);
  }

  private ConsultationRequest request() {
    return new ConsultationRequest("Test Client", "test@example.com", "", "email",
        "General chart reading", "Test question", "", "Asia/Kolkata", false, "", "", "", "");
  }

  @Test
  void acceptsSuccessWithoutTokenAndSendsConsultationPayload() throws IOException {
    new ConsultationEmailService(url, "").send(request());
    var payload = new ObjectMapper().readTree(requestBody);
    assertEquals("consultation", payload.path("type").asText());
    assertEquals("Test question", payload.path("question").asText());
    assertEquals("", payload.path("token").asText());
    assertEquals(1, posts.get());
  }

  @Test
  void followsAppsScriptRedirectAsGetWithoutRepeatingPost() {
    status = 302;
    redirect = "/result";
    new ConsultationEmailService(url, "").send(request());
    assertEquals(1, posts.get());
    assertEquals(1, gets.get());
  }

  @Test
  void rejectsWebhookApplicationError() {
    body = "{\"status\":\"error\",\"message\":\"Unauthorized\"}";
    assertThrows(ConsultationDeliveryException.class, () -> new ConsultationEmailService(url, "").send(request()));
  }

  @Test
  void rejectsHttpFailure() {
    status = 500;
    assertThrows(ConsultationDeliveryException.class, () -> new ConsultationEmailService(url, "").send(request()));
  }

  @Test
  void rejectsHtmlInsteadOfAcknowledgment() {
    body = "<html>Sign in</html>";
    assertThrows(ConsultationDeliveryException.class, () -> new ConsultationEmailService(url, "").send(request()));
  }

  @Test
  void rejectsRedirectWithoutLocation() {
    status = 302;
    assertThrows(ConsultationDeliveryException.class, () -> new ConsultationEmailService(url, "").send(request()));
  }

  @Test
  void rejectsMissingConfigurationBeforeNetworkCall() {
    assertThrows(ConsultationDeliveryException.class, () -> new ConsultationEmailService("", "").send(request()));
    assertEquals(0, posts.get());
  }
}
