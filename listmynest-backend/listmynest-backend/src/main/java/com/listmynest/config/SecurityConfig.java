package com.listmynest.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public RequestLoggingFilter requestLoggingFilter() {
        return new RequestLoggingFilter();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthFilter jwtAuthFilter,
            RequestLoggingFilter requestLoggingFilter,
            PublicWriteIpRateLimitFilter publicWriteIpRateLimitFilter,
            Environment environment
    ) throws Exception {
        boolean prod = Arrays.asList(environment.getActiveProfiles()).contains("prod");
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> {
                    auth.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/properties/**").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/v1/leads").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/v1/leads/whatsapp-inbound").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/v1/visits").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/whatsapp/**").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/v1/properties/*/view").permitAll();
                    auth.requestMatchers("/v1/auth/**").permitAll();
                    auth.requestMatchers("/v1/buyers/otp/**").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/v1/notify-me").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/config/site").permitAll();
                    auth.requestMatchers(HttpMethod.GET, "/v1/public/agents").permitAll();

                    if (prod) {
                        auth.requestMatchers("/actuator/health", "/actuator/health/**").permitAll();
                        auth.requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").denyAll();
                        auth.requestMatchers("/actuator/**").denyAll();
                    } else {
                        auth.requestMatchers("/actuator/**").permitAll();
                        auth.requestMatchers("/swagger-ui/**").permitAll();
                        auth.requestMatchers("/v3/api-docs/**").permitAll();
                    }

                    if (!prod) {
                        auth.requestMatchers(HttpMethod.GET, "/mock-upload/**").permitAll();
                        auth.requestMatchers(HttpMethod.HEAD, "/mock-upload/**").permitAll();
                        auth.requestMatchers(HttpMethod.PUT, "/mock-upload/**").permitAll();
                    }

                    auth.requestMatchers(HttpMethod.POST, "/v1/admin/auth/login").permitAll();
                    auth.requestMatchers(HttpMethod.POST, "/v1/admin/auth/register").permitAll();

                    auth.requestMatchers("/v1/saved/**").hasRole("BUYER");
                    auth.requestMatchers("/v1/sellers/**").hasRole("SELLER");
                    auth.requestMatchers(HttpMethod.POST, "/v1/properties").hasRole("SELLER");
                    auth.requestMatchers(HttpMethod.PATCH, "/v1/properties/*/status").hasRole("SELLER");
                    auth.requestMatchers(HttpMethod.PUT, "/v1/properties/**").hasRole("SELLER");
                    auth.requestMatchers("/v1/properties/*/photos").hasRole("SELLER");
                    auth.requestMatchers("/v1/properties/*/photos/**").hasRole("SELLER");
                    auth.requestMatchers("/v1/agents/**").hasRole("AGENT");
                    auth.requestMatchers(HttpMethod.GET, "/v1/visits").hasRole("AGENT");
                    auth.requestMatchers(HttpMethod.PATCH, "/v1/visits/*/status").hasRole("AGENT");
                    auth.requestMatchers(HttpMethod.PATCH, "/v1/visits/*/reschedule").hasRole("AGENT");
                    auth.requestMatchers(HttpMethod.GET, "/v1/leads/seller").hasRole("SELLER");
                    auth.requestMatchers(HttpMethod.GET, "/v1/leads").hasRole("AGENT");
                    auth.requestMatchers("/v1/admin/**").hasRole("ADMIN");

                    auth.anyRequest().authenticated();
                })
                // JwtAuthFilter is a custom filter (no built-in order), so anchor relative to a known filter.
                .addFilterBefore(requestLoggingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(publicWriteIpRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
