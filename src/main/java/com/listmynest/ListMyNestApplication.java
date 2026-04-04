package com.listmynest;

// ListMyNest — Spring Boot Application Entry Point

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ListMyNestApplication {
    public static void main(String[] args) {
        SpringApplication.run(ListMyNestApplication.class, args);
    }
}
