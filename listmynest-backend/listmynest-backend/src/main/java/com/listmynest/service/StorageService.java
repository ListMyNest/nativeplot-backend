package com.listmynest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.listmynest.dto.UploadUrlResponse;
import com.listmynest.exception.AppException;
import com.listmynest.storage.LocalMockStoragePaths;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-key:}")
    private String serviceKey;

    @Value("${supabase.storage-bucket:property-photos}")
    private String bucket;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    /**
     * Requests a Supabase signed upload URL for direct client PUT upload.
     */
    public UploadUrlResponse generateUploadUrl(UUID propertyId, String fileName) {
        String safeName = sanitizeFileName(fileName);
        String storagePath = "properties/" + propertyId + "/" + UUID.randomUUID() + "_" + safeName;

        if (useLocalMockObjectStorage()) {
            if (isBlank(serviceKey)) {
                log.warn("Supabase service key blank; using local mock storage (PUT {})", mockUploadBase() + "/" + storagePath);
            } else if (serviceKey.trim().startsWith("sb_publishable_")) {
                log.warn(
                        "SUPABASE_SERVICE_KEY is publishable (not secret/service_role); cannot sign uploads. Using local mock storage. Set service_role or sb_secret for real Supabase Storage.");
            } else if (isBlank(supabaseUrl)) {
                log.warn("SUPABASE_URL blank; using local mock storage");
            }
            return new UploadUrlResponse(mockUploadBase() + "/" + storagePath, storagePath);
        }

        if (isBlank(supabaseUrl) || isBlank(serviceKey)) {
            throw new AppException(502, "STORAGE_NOT_CONFIGURED");
        }
        if (serviceKey.trim().startsWith("sb_publishable_")) {
            log.error("SUPABASE_SERVICE_KEY is publishable; signed storage uploads are not supported. Use service_role or sb_secret.");
            throw new AppException(500, "SUPABASE_PUBLISHABLE_KEY_NOT_ALLOWED");
        }

        String apiBase = trimTrailingSlash(supabaseUrl);
        URI signUri = buildUploadSignUri(apiBase, bucket, storagePath);

        HttpHeaders headers = supabaseHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Match @supabase/storage-js: POST with empty JSON object (not expiresIn-only body).
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(Collections.emptyMap(), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(signUri, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error(
                        "Supabase upload sign non-2xx: status={} body={}",
                        response.getStatusCode(),
                        truncateForLog(response.getBody(), 500));
                throw new AppException(502, "STORAGE_SIGN_FAILED");
            }
            String signed = extractSignedUploadUrl(response.getBody());
            if (signed == null || signed.isBlank()) {
                log.error("Unexpected Supabase sign response: {}", truncateForLog(response.getBody(), 800));
                throw new AppException(502, "STORAGE_SIGN_FAILED");
            }
            signed = absolutizeStorageUrl(signed, apiBase);
            return new UploadUrlResponse(signed, storagePath);
        } catch (HttpStatusCodeException e) {
            log.error(
                    "Supabase upload sign HTTP error: status={} body={}",
                    e.getStatusCode(),
                    truncateForLog(e.getResponseBodyAsString(), 800));
            throw new AppException(502, "STORAGE_SIGN_FAILED");
        } catch (RestClientException e) {
            log.error("Supabase upload sign request failed: {}", e.getMessage());
            throw new AppException(502, "STORAGE_SIGN_FAILED");
        }
    }

    /**
     * Deletes an object from Supabase Storage. Accepts either a storage path or a full public URL.
     */
    public void deletePhoto(String storagePathOrUrl) {
        String path = resolveStoragePath(storagePathOrUrl);
        if (path.isBlank()) {
            return;
        }

        if (useLocalMockObjectStorage()) {
            deleteLocalMockFile(path);
            return;
        }

        String apiBase = trimTrailingSlash(supabaseUrl);
        URI deleteUri = buildObjectPathUri(apiBase, bucket, path);

        try {
            HttpEntity<Void> entity = new HttpEntity<>(supabaseHeaders());
            ResponseEntity<Void> response = restTemplate.exchange(deleteUri, HttpMethod.DELETE, entity, Void.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("Supabase delete returned status {} for path {}", response.getStatusCode(), path);
            }
        } catch (RestClientException e) {
            log.error("Supabase delete failed for {}: {}", path, e.getMessage());
            throw new AppException(502, "STORAGE_DELETE_FAILED");
        }
    }

    /**
     * Readable image URL: local mock base + path, or Supabase signed GET URL (works with private buckets).
     * Falls back to the public object URL pattern if signing fails.
     */
    public String getPublicUrl(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return "";
        }
        String clean = storagePath.replaceFirst("^/+", "");
        if (useLocalMockObjectStorage()) {
            return mockUploadBase() + "/" + clean;
        }
        if (isBlank(supabaseUrl) || isBlank(serviceKey)) {
            log.warn("Supabase not configured; cannot resolve image URL for {}", clean);
            return "";
        }
        String signed = tryCreateSignedReadUrl(clean);
        if (!signed.isBlank()) {
            return signed;
        }
        String apiBase = trimTrailingSlash(supabaseUrl);
        return apiBase + "/storage/v1/object/public/" + bucket + "/" + clean;
    }

    /**
     * Normalize DB values: relative paths, full Supabase public URLs (re-sign for private buckets), mock URLs, or pass-through.
     */
    public String resolveReadableImageUrl(String storageUrlOrPath) {
        if (isBlank(storageUrlOrPath)) {
            return "";
        }
        String u = storageUrlOrPath.trim();
        if ((u.startsWith("http://") || u.startsWith("https://")) && u.contains("/storage/v1/object/public/")) {
            String marker = "/storage/v1/object/public/" + bucket + "/";
            int idx = u.indexOf(marker);
            if (idx >= 0) {
                String objectPath = u.substring(idx + marker.length());
                int q = objectPath.indexOf('?');
                if (q >= 0) {
                    objectPath = objectPath.substring(0, q);
                }
                return getPublicUrl(objectPath);
            }
        }
        if (u.startsWith("http://") || u.startsWith("https://")) {
            return u;
        }
        return getPublicUrl(u);
    }

    private String tryCreateSignedReadUrl(String objectPath) {
        String apiBase = trimTrailingSlash(supabaseUrl);
        try {
            UriComponentsBuilder ub = UriComponentsBuilder.fromHttpUrl(apiBase).path("/storage/v1/object/sign");
            ub.pathSegment(bucket);
            for (String part : objectPath.split("/")) {
                if (!part.isBlank()) {
                    ub.pathSegment(part);
                }
            }
            URI uri = ub.encode().build().toUri();

            HttpHeaders headers = supabaseHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity =
                    new HttpEntity<>(Collections.singletonMap("expiresIn", 604800), headers);

            ResponseEntity<String> response = restTemplate.exchange(uri, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.warn("Supabase sign read non-2xx: {}", response.getStatusCode());
                return "";
            }
            String fragment = extractSignedReadUrl(response.getBody());
            if (fragment == null || fragment.isBlank()) {
                log.warn("Supabase sign read: no signedURL in body");
                return "";
            }
            return absolutizeSignedReadUrl(fragment, apiBase);
        } catch (HttpStatusCodeException e) {
            log.warn(
                    "Supabase sign read HTTP {} — {}",
                    e.getStatusCode(),
                    truncateForLog(e.getResponseBodyAsString(), 400));
            return "";
        } catch (RestClientException e) {
            log.warn("Supabase sign read request failed: {}", e.getMessage());
            return "";
        } catch (Exception e) {
            log.warn("Supabase sign read unexpected: {}", e.getMessage());
            return "";
        }
    }

    private String extractSignedReadUrl(String jsonBody) {
        try {
            JsonNode root = objectMapper.readTree(jsonBody.getBytes(StandardCharsets.UTF_8));
            for (String key : new String[] {"signedURL", "signedUrl", "signed_url"}) {
                JsonNode n = root.get(key);
                if (n != null && n.isTextual() && !n.asText().isBlank()) {
                    return n.asText();
                }
            }
            JsonNode data = root.get("data");
            if (data != null && data.isObject()) {
                for (String key : new String[] {"signedURL", "signedUrl", "signed_url"}) {
                    JsonNode n = data.get(key);
                    if (n != null && n.isTextual() && !n.asText().isBlank()) {
                        return n.asText();
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse signed read JSON: {}", e.getMessage());
        }
        return null;
    }

    private static String absolutizeSignedReadUrl(String signedFragment, String apiBase) {
        String s = signedFragment.trim();
        if (s.startsWith("http://") || s.startsWith("https://")) {
            return s;
        }
        String base = trimTrailingSlash(apiBase);
        if (s.startsWith("/storage/v1/")) {
            return base + s;
        }
        if (s.startsWith("/object/")) {
            return base + "/storage/v1" + s;
        }
        if (s.startsWith("/")) {
            return base + s;
        }
        return base + "/storage/v1/" + s;
    }

    /**
     * Use on-disk mock storage when Supabase is incomplete or only a publishable key is set
     * (publishable keys cannot create signed upload URLs).
     */
    private boolean useLocalMockObjectStorage() {
        if (!isLocalProfile()) {
            return false;
        }
        if (isBlank(supabaseUrl) || isBlank(serviceKey)) {
            return true;
        }
        return serviceKey.trim().startsWith("sb_publishable_");
    }

    private boolean isLocalProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("local");
    }

    private String mockUploadBase() {
        String base = trimTrailingSlash(appBaseUrl == null ? "" : appBaseUrl.trim());
        if (base.isEmpty()) {
            base = "http://localhost:8080";
        }
        return base + "/mock-upload";
    }

    private void deleteLocalMockFile(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        String clean = relativePath.replaceFirst("^/+", "");
        if (clean.contains("..")) {
            return;
        }
        Path root = LocalMockStoragePaths.ROOT.normalize();
        Path file = root.resolve(clean).normalize();
        if (!file.startsWith(root)) {
            return;
        }
        try {
            if (Files.isRegularFile(file)) {
                Files.delete(file);
            }
        } catch (IOException e) {
            log.warn("Mock storage delete failed for {}: {}", clean, e.getMessage());
        }
    }

    private String extractSignedUploadUrl(String jsonBody) {
        try {
            JsonNode root = objectMapper.readTree(jsonBody.getBytes(StandardCharsets.UTF_8));
            for (String key : new String[] {"signedURL", "signedUrl", "signed_url", "url"}) {
                JsonNode n = root.get(key);
                if (n != null && n.isTextual() && !n.asText().isBlank()) {
                    return n.asText();
                }
            }
            JsonNode data = root.get("data");
            if (data != null && data.isObject()) {
                for (String key : new String[] {"signedUrl", "signedURL", "signed_url", "url"}) {
                    JsonNode n = data.get(key);
                    if (n != null && n.isTextual() && !n.asText().isBlank()) {
                        return n.asText();
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse signed upload JSON: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Supabase returns a path-relative {@code url} (e.g. {@code /object/upload/sign/...}); browsers need an absolute URL for PUT.
     */
    private static String absolutizeStorageUrl(String signedOrRelative, String projectBaseUrl) {
        String s = signedOrRelative.trim();
        if (s.startsWith("http://") || s.startsWith("https://")) {
            return s;
        }
        if (s.startsWith("/")) {
            return trimTrailingSlash(projectBaseUrl) + "/storage/v1" + s;
        }
        return s;
    }

    private static URI buildUploadSignUri(String projectBaseUrl, String bucketName, String objectPath) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(projectBaseUrl)
                .path("/storage/v1/object/upload/sign");
        appendBucketAndObjectPath(b, bucketName, objectPath);
        return b.build().toUri();
    }

    private static URI buildObjectPathUri(String projectBaseUrl, String bucketName, String objectPath) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(projectBaseUrl).path("/storage/v1/object");
        appendBucketAndObjectPath(b, bucketName, objectPath);
        return b.build().toUri();
    }

    private static void appendBucketAndObjectPath(UriComponentsBuilder b, String bucketName, String objectPath) {
        b.pathSegment(bucketName);
        String clean = objectPath == null ? "" : objectPath.replaceFirst("^/+", "");
        if (clean.isEmpty()) {
            return;
        }
        for (String segment : clean.split("/")) {
            if (!segment.isEmpty()) {
                b.pathSegment(segment);
            }
        }
    }

    private static String truncateForLog(String s, int maxLen) {
        if (s == null) {
            return "";
        }
        String t = s.replace("\r\n", " ").replace("\n", " ");
        return t.length() <= maxLen ? t : t.substring(0, maxLen) + "…";
    }

    private HttpHeaders supabaseHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(serviceKey.trim());
        headers.set("apikey", serviceKey.trim());
        return headers;
    }

    private String resolveStoragePath(String storageUrlOrPath) {
        if (storageUrlOrPath == null) {
            return "";
        }
        String s = storageUrlOrPath.trim();
        if (s.isEmpty()) {
            return "";
        }

        String mockPublic = "http://localhost/mock/";
        if (s.startsWith(mockPublic)) {
            return s.substring(mockPublic.length());
        }
        String mockMarker = "/mock-upload/";
        int mockIdx = s.indexOf(mockMarker);
        if (mockIdx >= 0 && s.contains("://")) {
            return s.substring(mockIdx + mockMarker.length());
        }

        if (!isBlank(supabaseUrl)) {
            String apiBase = trimTrailingSlash(supabaseUrl);
            String prefix = apiBase + "/storage/v1/object/public/" + bucket + "/";
            if (s.startsWith(prefix)) {
                return s.substring(prefix.length());
            }
        }

        if (!s.contains("://")) {
            return s;
        }

        String marker = "/storage/v1/object/public/" + bucket + "/";
        int idx = s.indexOf(marker);
        if (idx >= 0) {
            return s.substring(idx + marker.length());
        }
        return s;
    }

    private static String sanitizeFileName(String fileName) {
        String base = fileName.replace("\\", "/");
        int slash = base.lastIndexOf('/');
        if (slash >= 0) {
            base = base.substring(slash + 1);
        }
        base = base.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (base.isBlank()) {
            return "photo.jpg";
        }
        return base;
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isEmpty()) {
            return "";
        }
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
