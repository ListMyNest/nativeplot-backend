package com.listmynest.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${cors.allowed-origins:http://localhost:3000}") String allowedOrigins,
            Environment environment
    ) {
        boolean prod = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
        if (prod && origins.stream().anyMatch("*"::equals)) {
            throw new IllegalStateException(
                    "CORS_ALLOWED_ORIGINS cannot be '*' in production when credentials are enabled."
            );
        }
        // Support dev setups where the frontend is accessed via LAN IP (mobile testing).
        // If an origin contains '*', treat it as an origin pattern.
        if (origins.stream().anyMatch(o -> o.contains("*"))) {
            config.setAllowedOriginPatterns(origins);
        } else {
            config.setAllowedOrigins(origins);
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(
                List.of("Content-Disposition", "Content-Type", "Content-Length")
        );
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
