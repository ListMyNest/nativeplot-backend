package com.listmynest.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.Profiles;

import java.io.Closeable;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;

/**
 * Starts embedded Postgres when profile {@code local} is active. Uses reflection so the production
 * {@code bootJar} does not require {@code developmentOnly} embedded DB jars on the classpath.
 * <p>
 * Redis: use Docker {@code redis} in docker-compose.yml on port 6379, or any local Redis; connection is lazy-validated.
 */
@Slf4j
public class LocalEmbeddedServicesInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    private static Closeable embeddedPostgres;

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        ConfigurableEnvironment env = context.getEnvironment();
        if (!env.acceptsProfiles(Profiles.of("local"))) {
            return;
        }
        if (!Boolean.parseBoolean(env.getProperty("listmynest.embedded.enabled", "true"))) {
            return;
        }
        if (!Boolean.parseBoolean(env.getProperty("listmynest.embedded.postgres", "false"))) {
            log.info(
                    "Embedded Postgres disabled (listmynest.embedded.postgres=false). "
                            + "Using spring.datasource from configuration; set LISTMYNEST_EMBEDDED_POSTGRES=true for an ephemeral embedded DB."
            );
            return;
        }

        int requestedPort = Integer.parseInt(env.getProperty("listmynest.embedded.postgres-port", "0"));
        try {
            embeddedPostgres = startEmbeddedPostgres(requestedPort);
            int actualPort = readPostgresPort(embeddedPostgres);
            Map<String, Object> ds = new HashMap<>();
            ds.put("spring.datasource.url", "jdbc:postgresql://127.0.0.1:" + actualPort + "/postgres");
            env.getPropertySources().addFirst(new MapPropertySource("listmynestEmbeddedPostgres", ds));
            log.info("Embedded Postgres listening on 127.0.0.1:{} (jdbc URL overridden for this run)", actualPort);
        } catch (Exception e) {
            throw new IllegalStateException(
                    "Embedded Postgres failed (port conflict or start error). Set listmynest.embedded.postgres-port to a free port, stop stale Java/bootRun holding 5433, run Docker with listmynest.embedded.postgres=false, or close other Postgres instances.",
                    e);
        }

        context.addApplicationListener((org.springframework.context.ApplicationListener<ContextClosedEvent>) event -> shutdownPostgres());
        Runtime.getRuntime().addShutdownHook(new Thread(LocalEmbeddedServicesInitializer::shutdownPostgres, "listmynest-embedded-pg-shutdown"));
    }

    private static int readPostgresPort(Object pg) throws Exception {
        try {
            Object p = pg.getClass().getMethod("getPort").invoke(pg);
            return ((Number) p).intValue();
        } catch (NoSuchMethodException e) {
            Method[] methods = pg.getClass().getMethods();
            for (Method m : methods) {
                if ("getPort".equals(m.getName()) && m.getParameterCount() == 0) {
                    return ((Number) m.invoke(pg)).intValue();
                }
            }
            throw new IllegalStateException("Embedded Postgres instance has no getPort()");
        }
    }

    /** {@code port <= 0} lets Zonky pick an ephemeral port (avoids clashes with a stale process on 5433). */
    private static Closeable startEmbeddedPostgres(int port) throws Exception {
        Class<?> pgClass = Class.forName("io.zonky.test.db.postgres.embedded.EmbeddedPostgres");
        Object builder = pgClass.getMethod("builder").invoke(null);
        Method setPort = builder.getClass().getMethod("setPort", int.class);
        Method start = builder.getClass().getMethod("start");
        if (port > 0) {
            setPort.invoke(builder, port);
        }
        Object pg = start.invoke(builder);
        return (Closeable) pg;
    }

    private static void shutdownPostgres() {
        if (embeddedPostgres != null) {
            try {
                embeddedPostgres.close();
            } catch (Exception ignored) {
            } finally {
                embeddedPostgres = null;
            }
        }
    }
}
