package com.listmynest.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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
            RequestLoggingFilter requestLoggingFilter
    ) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/properties/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/leads").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/leads/whatsapp-inbound").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/visits").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/whatsapp/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/properties/*/view").permitAll()
                        .requestMatchers("/v1/auth/**").permitAll()
                        .requestMatchers("/v1/buyers/otp/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/notify-me").permitAll()
                        .requestMatchers(HttpMethod.GET, "/v1/config/site").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/swagger-ui/**").permitAll()
                        .requestMatchers("/v3/api-docs/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/mock-upload/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/mock-upload/**").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/mock-upload/**").permitAll()

                        .requestMatchers(HttpMethod.POST, "/v1/admin/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/v1/admin/auth/register").permitAll()

                        .requestMatchers("/v1/saved/**").hasRole("BUYER")
                        .requestMatchers("/v1/sellers/**").hasRole("SELLER")
                        .requestMatchers(HttpMethod.POST, "/v1/properties").hasRole("SELLER")
                        .requestMatchers(HttpMethod.PUT, "/v1/properties/**").hasRole("SELLER")
                        .requestMatchers("/v1/properties/*/photos").hasRole("SELLER")
                        .requestMatchers("/v1/properties/*/photos/**").hasRole("SELLER")
                        .requestMatchers("/v1/agents/**").hasRole("AGENT")
                        .requestMatchers(HttpMethod.GET, "/v1/visits").hasRole("AGENT")
                        // PathPattern (Spring 6) does not allow `**` in the middle (e.g. `/**/status`).
                        // Our visit endpoints are `/v1/visits/{id}/status` and `/v1/visits/{id}/reschedule`.
                        .requestMatchers(HttpMethod.PATCH, "/v1/visits/*/status").hasRole("AGENT")
                        .requestMatchers(HttpMethod.PATCH, "/v1/visits/*/reschedule").hasRole("AGENT")
                        .requestMatchers(HttpMethod.GET, "/v1/leads/seller").hasRole("SELLER")
                        .requestMatchers(HttpMethod.GET, "/v1/leads").hasRole("AGENT")
                        .requestMatchers("/v1/admin/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                // JwtAuthFilter is a custom filter (no built-in order), so anchor relative to a known filter.
                .addFilterBefore(requestLoggingFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }
}
