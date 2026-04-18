package com.listmynest.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.listmynest.dto.UploadUrlResponse;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StorageServiceMockRoutingTest {

    private static Environment localEnv() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[] {"local"});
        return env;
    }

    @Test
    void publishableKey_returnsMockUploadUrl() {
        StorageService svc = new StorageService(mock(RestTemplate.class), new ObjectMapper(), localEnv());
        ReflectionTestUtils.setField(svc, "supabaseUrl", "https://abc.supabase.co");
        ReflectionTestUtils.setField(svc, "serviceKey", "sb_publishable_testkey");
        ReflectionTestUtils.setField(svc, "bucket", "property-photos");
        ReflectionTestUtils.setField(svc, "appBaseUrl", "http://localhost:8080");

        UploadUrlResponse r = svc.generateUploadUrl(UUID.fromString("11111111-1111-1111-1111-111111111111"), "plot.png");
        assertTrue(r.uploadUrl().contains("/mock-upload/properties/"));
        assertTrue(r.uploadUrl().contains("_plot.png"));
        assertTrue(r.storagePath().startsWith("properties/"));
    }

    @Test
    void blankSupabaseUrl_returnsMockUploadUrl() {
        StorageService svc = new StorageService(mock(RestTemplate.class), new ObjectMapper(), localEnv());
        ReflectionTestUtils.setField(svc, "supabaseUrl", "");
        ReflectionTestUtils.setField(svc, "serviceKey", "sb_secret_should_not_matter");
        ReflectionTestUtils.setField(svc, "bucket", "b");
        ReflectionTestUtils.setField(svc, "appBaseUrl", "http://127.0.0.1:9090");

        UploadUrlResponse r = svc.generateUploadUrl(UUID.randomUUID(), "a.jpg");
        assertTrue(r.uploadUrl().startsWith("http://127.0.0.1:9090/mock-upload/"));
    }

    @Test
    void serviceRoleJwt_doesNotUseMockPath() {
        RestTemplate rt = mock(RestTemplate.class);
        when(rt.exchange(any(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenThrow(new IllegalStateException("would-hit-supabase"));

        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[] {"local"});

        StorageService svc2 = new StorageService(rt, new ObjectMapper(), env);
        ReflectionTestUtils.setField(svc2, "supabaseUrl", "https://abc.supabase.co");
        ReflectionTestUtils.setField(
                svc2,
                "serviceKey",
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature");
        ReflectionTestUtils.setField(svc2, "bucket", "property-photos");
        ReflectionTestUtils.setField(svc2, "appBaseUrl", "http://localhost:8080");

        try {
            svc2.generateUploadUrl(UUID.randomUUID(), "x.png");
        } catch (IllegalStateException e) {
            assertTrue(e.getMessage().contains("would-hit-supabase"));
            return;
        }
        assertFalse(true, "expected RestTemplate to be used for JWT service key");
    }
}
