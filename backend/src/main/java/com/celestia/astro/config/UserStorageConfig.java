package com.celestia.astro.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;

@Configuration
@EnableTransactionManagement
@ConditionalOnProperty(name = "celestia.storage", havingValue = "postgres")
public class UserStorageConfig {
  @Bean
  DataSource userDataSource(@Value("${CELESTIA_DATABASE_URL}") String url,
                           @Value("${CELESTIA_DATABASE_USERNAME}") String username,
                           @Value("${CELESTIA_DATABASE_PASSWORD}") String password) {
    if (!url.startsWith("jdbc:postgresql://") || !url.contains("sslmode=require")) {
      throw new IllegalArgumentException("CELESTIA_DATABASE_URL must be a PostgreSQL JDBC URL with sslmode=require.");
    }
    DriverManagerDataSource source = new DriverManagerDataSource();
    source.setDriverClassName("org.postgresql.Driver");
    source.setUrl(url);
    source.setUsername(username);
    source.setPassword(password);
    return source;
  }

  @Bean
  PlatformTransactionManager transactionManager(DataSource userDataSource) {
    return new DataSourceTransactionManager(userDataSource);
  }
}
