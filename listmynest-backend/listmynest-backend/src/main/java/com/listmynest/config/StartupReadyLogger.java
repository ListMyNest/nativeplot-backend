package com.listmynest.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * One-line readiness banner so local logs clearly show when the API is accepting traffic.
 */
@Component
@Slf4j
public class StartupReadyLogger {

    private final Environment environment;

    public StartupReadyLogger(Environment environment) {
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        String[] profiles = environment.getActiveProfiles();
        String port = environment.getProperty("server.port", "?");
        log.info(
                "LISTMYNEST_API_READY profiles={} port={} — HTTP request/response lines use MDC key [rid]",
                profiles.length == 0 ? "default" : String.join(",", profiles),
                port
        );
    }
}
