package com.listmynest;

// ListMyNest — Spring Boot Application Entry Point

import com.listmynest.config.LocalEmbeddedServicesInitializer;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ListMyNestApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(ListMyNestApplication.class);
        app.addInitializers(new LocalEmbeddedServicesInitializer());
        app.run(args);
    }
}
