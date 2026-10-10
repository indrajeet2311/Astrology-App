package com.celestia.astro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class UserDataPersistenceTest {
  @TempDir Path directory;
  private final ObjectMapper json = new ObjectMapper();

  private UserDataService service() {
    return new UserDataService(json, new UserDocumentStore(json, directory.toString(), "file", "",
        new DefaultListableBeanFactory().getBeanProvider(DataSource.class)), "test-admin");
  }

  @SuppressWarnings("unchecked")
  private String token(Map<String, Object> response) {
    assertEquals("client", ((Map<String, Object>) response.get("user")).get("role"));
    return (String) response.get("token");
  }

  @Test
  void accountSessionAndLogoutSurviveServiceRecreation() {
    UserDataService first = service();
    String token = token(first.register("Test", "test@example.com", "test-password"));
    UserDataService second = service();
    assertNotNull(second.currentUser(token).get("user"));
    assertThrows(IllegalArgumentException.class, () -> second.login("test@example.com", "wrong-password"));
    assertThrows(IllegalArgumentException.class, () -> second.register("Duplicate", "TEST@example.com", "test-password"));
    assertNotNull(second.login("test@example.com", "test-password").get("token"));
    second.logout(token);
    assertNull(service().currentUser(token).get("user"));
  }

  @Test
  void chartOwnershipUpdatesAndDeletionSurviveServiceRecreation() throws Exception {
    UserDataService first = service();
    String owner = token(first.register("Owner", "owner@example.com", "test-password"));
    String other = token(first.register("Other", "other@example.com", "test-password"));
    var chart = first.saveChart(owner, json.readTree("{\"label\":\"Original\",\"payload\":{\"date\":\"2000-01-01\",\"name\":\"Test\"}}"));
    String id = (String) chart.get("id");
    UserDataService second = service();
    assertEquals(1, second.getCharts(owner).size());
    assertTrue(second.getCharts(other).isEmpty());
    assertFalse(second.deleteChart(other, id));
    assertThrows(IllegalArgumentException.class, () -> second.getCharts("invalid-token"));
    second.updateChart(owner, id, json.readTree("{\"label\":\"Updated\"}"));
    assertEquals("Updated", service().getCharts(owner).get(0).get("label"));
    assertTrue(second.deleteChart(owner, id));
    assertTrue(service().getCharts(owner).isEmpty());
  }

  @Test
  void consultationPersistenceAndAdminAuthorization() throws Exception {
    UserDataService first = service();
    String client = token(first.register("Client", "client@example.com", "test-password"));
    var request = new LinkedHashMap<String, Object>();
    request.put("email", "client@example.com");
    request.put("question", "Test");
    String id = (String) first.addConsultation(request).get("id");
    UserDataService second = service();
    String admin = (String) second.adminLogin("test-admin").get("token");
    assertThrows(IllegalArgumentException.class, () -> second.getConsultations(client, true));
    assertEquals(id, second.getConsultations(client, false).get(0).get("id"));
    second.updateConsultation(admin, id, json.readTree("{\"status\":\"completed\"}"));
    assertEquals("completed", service().getConsultations(admin, true).get(0).get("status"));
    assertTrue(second.deleteConsultation(admin, id));
    assertTrue(service().getConsultations(admin, true).isEmpty());
  }

  @Test
  void corruptDataIsAnErrorRatherThanAnEmptySuccess() throws Exception {
    service();
    Files.writeString(directory.resolve("users.json"), "invalid json");
    assertThrows(IllegalStateException.class, () -> service().login("test@example.com", "test-password"));
  }

  @Test
  void invalidModeAndFileModeImportAreRejected() {
    var sources = new DefaultListableBeanFactory().getBeanProvider(DataSource.class);
    assertThrows(IllegalArgumentException.class, () -> new UserDocumentStore(json, directory.toString(), "unknown", "", sources));
    assertThrows(IllegalArgumentException.class, () -> new UserDocumentStore(json, directory.toString(), "file", directory.toString(), sources));
  }
}
