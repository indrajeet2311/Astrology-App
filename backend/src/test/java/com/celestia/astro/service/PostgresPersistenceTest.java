package com.celestia.astro.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "CELESTIA_TEST_DATABASE_URL", matches = ".+")
class PostgresPersistenceTest {
  @TempDir Path directory;
  private final ObjectMapper json = new ObjectMapper();
  private SingleConnectionDataSource source;
  private JdbcTemplate jdbc;
  private TransactionTemplate transactions;
  private DefaultListableBeanFactory beans;
  private String schema;

  @BeforeEach
  void setup() {
    source = new SingleConnectionDataSource(System.getenv("CELESTIA_TEST_DATABASE_URL"),
        System.getenv("CELESTIA_TEST_DATABASE_USERNAME"), System.getenv("CELESTIA_TEST_DATABASE_PASSWORD"), true);
    jdbc = new JdbcTemplate(source);
    schema = "celestia_test_" + UUID.randomUUID().toString().replace("-", "");
    jdbc.execute("CREATE SCHEMA " + schema);
    jdbc.execute("SET search_path TO " + schema);
    assertEquals(schema, jdbc.queryForObject("SELECT current_schema()", String.class),
        "Test schema isolation must be active.");
    transactions = new TransactionTemplate(new DataSourceTransactionManager(source));
    beans = new DefaultListableBeanFactory();
    beans.registerSingleton("dataSource", source);
  }

  @AfterEach
  void cleanup() {
    try {
      if (schema != null) jdbc.execute("DROP SCHEMA " + schema + " CASCADE");
    } finally {
      if (source != null) source.destroy();
    }
  }

  private UserDocumentStore store(String importDirectory) {
    return new UserDocumentStore(json, directory.toString(), "postgres", importDirectory, beans.getBeanProvider(DataSource.class));
  }

  private UserDataService service() { return new UserDataService(json, store(""), "test-admin"); }

  @Test
  void accountChartAndSessionPersistAcrossConnectionsAndRollback() {
    UserDataService first = service();
    String token = transactions.execute(status -> (String) first.register("Test", "test@example.com", "test-password").get("token"));
    var body = json.createObjectNode();
    body.putObject("payload").put("date", "2000-01-01");
    transactions.executeWithoutResult(status -> first.saveChart(token, body));
    UserDataService second = service();
    transactions.executeWithoutResult(status -> {
      assertNotNull(second.currentUser(token).get("user"));
      assertEquals(1, second.getCharts(token).size());
      assertThrows(IllegalArgumentException.class, () -> second.getCharts("wrong-token"));
      second.logout(token);
      status.setRollbackOnly();
    });
    transactions.executeWithoutResult(status -> assertNotNull(service().currentUser(token).get("user")));
    assertThrows(IllegalStateException.class, () -> second.currentUser(token));
  }

  @Test
  void importsAllDocumentsWithoutChangingHashesOrIdsAndRejectsOverwrite() throws Exception {
    UserDocumentStore file = new UserDocumentStore(json, directory.toString(), "file", "", beans.getBeanProvider(DataSource.class));
    UserDataService original = new UserDataService(json, file, "test-admin");
    String token = (String) original.register("Imported", "imported@example.com", "test-password").get("token");
    String originalUsers = Files.readString(directory.resolve("users.json"));
    store(directory.toString());
    UserDataService migrated = service();
    transactions.executeWithoutResult(status -> {
      assertNotNull(migrated.currentUser(token).get("user"));
      assertNotNull(migrated.login("imported@example.com", "test-password").get("token"));
    });
    assertEquals(originalUsers, jdbc.queryForObject("SELECT body FROM celestia_user_documents WHERE name = 'users.json'", String.class));
    assertThrows(IllegalStateException.class, () -> store(directory.toString()));
  }

  @Test
  void missingImportFileRollsBackAllImportedData() throws Exception {
    new UserDocumentStore(json, directory.toString(), "file", "", beans.getBeanProvider(DataSource.class));
    Files.delete(directory.resolve("consultations.json"));
    assertThrows(IllegalStateException.class, () -> store(directory.toString()));
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM celestia_user_documents", Integer.class));
  }
}
