package com.celestia.astro.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {"celestia.storage=file", "CELESTIA_IMPORT_DIR=", "ADMIN_PASSKEY=test-admin"})
class FileStorageStartupTest {
  @TempDir static Path directory;
  @Autowired UserDataService users;

  @DynamicPropertySource
  static void storageDirectory(DynamicPropertyRegistry registry) {
    registry.add("celestia.data-dir", () -> directory.toString());
  }

  @Test
  void startsWithoutDatabaseConfigurationAndRetainsAccountBehavior() {
    String token = (String) users.register("Startup Test", "startup@example.com", "test-password").get("token");
    assertNotNull(users.currentUser(token).get("user"));
    assertNotNull(users.login("startup@example.com", "test-password").get("token"));
    users.logout(token);
    assertNull(users.currentUser(token).get("user"));
  }
}
