package com.celestia.astro.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class UserDocumentStore {
  private static final List<String> DOCUMENTS = List.of("users.json", "sessions.json", "user_charts.json", "consultations.json");
  private final ObjectMapper json;
  private final Path directory;
  private final JdbcTemplate database;

  public UserDocumentStore(ObjectMapper json,
                           @Value("${celestia.data-dir:./data}") String directory,
                           @Value("${celestia.storage:file}") String mode,
                           @Value("${CELESTIA_IMPORT_DIR:}") String importDirectory,
                           ObjectProvider<DataSource> sources) {
    this.json = json;
    this.directory = Path.of(directory).toAbsolutePath().normalize();
    if (!List.of("file", "postgres").contains(mode)) throw new IllegalArgumentException("CELESTIA_STORAGE must be file or postgres.");
    DataSource source = "postgres".equals(mode) ? sources.getObject() : null;
    database = source == null ? null : new JdbcTemplate(source);
    try {
      if (database == null) {
        if (!importDirectory.isBlank()) throw new IllegalArgumentException("CELESTIA_IMPORT_DIR requires PostgreSQL storage.");
        Files.createDirectories(this.directory);
        for (String name : DOCUMENTS) {
          if (!Files.exists(this.directory.resolve(name))) Files.writeString(this.directory.resolve(name), empty(name), StandardCharsets.UTF_8);
        }
      } else {
        // JSON documents preserve existing IDs, password hashes and API shapes during migration.
        database.execute("CREATE TABLE IF NOT EXISTS celestia_user_documents (name VARCHAR(40) PRIMARY KEY, body TEXT NOT NULL)");
        new TransactionTemplate(new DataSourceTransactionManager(source)).executeWithoutResult(status -> {
          lock();
          for (String name : DOCUMENTS) database.update(
              "INSERT INTO celestia_user_documents(name, body) VALUES (?, ?) ON CONFLICT (name) DO NOTHING", name, empty(name));
          if (!importDirectory.isBlank()) importDocuments(Path.of(importDirectory));
        });
      }
    } catch (IOException e) {
      throw new IllegalStateException("Could not initialize user data storage.", e);
    }
  }

  private static String empty(String name) { return name.equals("sessions.json") ? "{}" : "[]"; }

  private void lock() {
    if (!TransactionSynchronizationManager.isActualTransactionActive()) {
      throw new IllegalStateException("PostgreSQL user data operations require an active transaction.");
    }
    // All document read/modify/write operations share a transaction-scoped cross-instance lock.
    database.execute("SELECT pg_advisory_xact_lock(1729348101)");
  }

  private void checkName(String name) {
    if (!DOCUMENTS.contains(name)) throw new IllegalArgumentException("Unknown user data document.");
  }

  private String raw(String name) throws IOException {
    return database == null ? Files.readString(directory.resolve(name), StandardCharsets.UTF_8)
        : database.queryForObject("SELECT body FROM celestia_user_documents WHERE name = ?", String.class, name);
  }

  public <T> T read(String name, TypeReference<T> type) {
    checkName(name);
    if (database != null) lock();
    try {
      String body = raw(name);
      validate(name, body);
      return json.readValue(body, type);
    } catch (IOException e) {
      throw new IllegalStateException("Could not read user data storage.", e);
    }
  }

  public void write(String name, Object value) {
    checkName(name);
    if (database != null) lock();
    try {
      String body = json.writeValueAsString(value);
      validate(name, body);
      if (database != null) {
        if (database.update("UPDATE celestia_user_documents SET body = ? WHERE name = ?", body, name) != 1) {
          throw new IllegalStateException("User data document is missing.");
        }
      } else {
        Path target = directory.resolve(name);
        Path temporary = directory.resolve(name + ".tmp");
        Files.writeString(temporary, body, StandardCharsets.UTF_8);
        try { Files.move(temporary, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING, java.nio.file.StandardCopyOption.ATOMIC_MOVE); }
        catch (java.nio.file.AtomicMoveNotSupportedException e) { Files.move(temporary, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING); }
      }
    } catch (IOException e) {
      throw new IllegalStateException("Could not save user data storage.", e);
    }
  }

  private JsonNode validate(String name, String body) throws IOException {
    JsonNode node = json.readTree(body);
    if (node == null || (name.equals("sessions.json") ? !node.isObject() : !node.isArray())) {
      throw new IllegalStateException("Invalid user data document: " + name);
    }
    return node;
  }

  private void importDocuments(Path source) {
    Map<String, String> imported = new LinkedHashMap<>();
    try {
      for (String name : DOCUMENTS) {
        String body = Files.readString(source.resolve(name), StandardCharsets.UTF_8);
        validate(name, body);
        imported.put(name, body);
        if (!validate(name, raw(name)).isEmpty()) {
          throw new IllegalStateException("Import refused: PostgreSQL already contains user data. Remove CELESTIA_IMPORT_DIR after a successful import.");
        }
      }
      for (var entry : imported.entrySet()) {
        database.update("UPDATE celestia_user_documents SET body = ? WHERE name = ?", entry.getValue(), entry.getKey());
      }
    } catch (IOException e) {
      throw new IllegalStateException("Could not import all four user data documents; no partial import was committed.", e);
    }
  }
}
