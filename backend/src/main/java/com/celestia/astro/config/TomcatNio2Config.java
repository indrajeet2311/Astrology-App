package com.celestia.astro.config;

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Uses Tomcat's asynchronous NIO2 connector for local and hosted runs. */
@Configuration
public class TomcatNio2Config {
  @Bean
  WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatNio2Connector() {
    return factory -> factory.setProtocol("org.apache.coyote.http11.Http11Nio2Protocol");
  }
}
