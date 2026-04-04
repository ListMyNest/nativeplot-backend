package com.listmynest.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.listmynest.dto.UploadUrlResponse;
import com.listmynest.exception.AppException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StorageService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${supabase.url:}")
    private String supabaseUrl;

    @Value("${supabase.service-key:}")
    private String serviceKey;

    @Value("${supabase.storage-bucket:property-photos}")
    private String bucket;

    /**
     * Requests a Supabase signed upload URL for direct client PUT upload.
     */
    public UploadUrlResponse generateUploadUrl(UUID propertyId, String fileName) {
        String safeName = sanitizeFileName(fileName);
        String storagePath = "properties/" + propertyId + "/" + UUID.randomUUID() + "_" + safeName;

        if (isBlank(supabaseUrl) || isBlank(serviceKey)) {
            log.warn("Supabase URL or service key blank — returning mock signed upload URL (dev)");
            String uploadUrl = "http://localhost/mock-upload/" + storagePath;
            return new UploadUrlResponse(uploadUrl, storagePath);
        }

        String apiBase = trimTrailingSlash(supabaseUrl);
        String pathEncoded = storagePath.replace("/", "%2F");
        String url = apiBase + "/storage/v1/object/upload/sign/" + bucket + "/" + pathEncoded;

        HttpHeaders headers = supabaseHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(Map.of("expiresIn", 3600), headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new AppException(502, "STORAGE_SIGN_FAILED");
            }
            String signed = extractSignedUploadUrl(response.getBody());
            if (signed == null || signed.isBlank()) {
                log.error("Unexpected Supabase sign response: {}", response.getBody());
                throw new AppException(502, "STORAGE_SIGN_FAILED");
            }
            return new UploadUrlResponse(signed, storagePath);
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

        if (isBlank(supabaseUrl) || isBlank(serviceKey)) {
            log.warn("Supabase not configured — skipping storage delete for path {}", path);
            return;
        }

        String apiBase = trimTrailingSlash(supabaseUrl);
        String pathEncoded = path.replace("/", "%2F");
        String url = apiBase + "/storage/v1/object/" + bucket + "/" + pathEncoded;

        try {
            HttpEntity<Void> entity = new HttpEntity<>(supabaseHeaders());
            ResponseEntity<Void> response = restTemplate.exchange(url, HttpMethod.DELETE, entity, Void.class);
            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("Supabase delete returned status {} for path {}", response.getStatusCode(), path);
            }
        } catch (RestClientException e) {
            log.error("Supabase delete failed for {}: {}", path, e.getMessage());
            throw new AppException(502, "STORAGE_DELETE_FAILED");
        }
    }

    /**
     * Public (non-signed) object URL for serving images.
     */
    public String getPublicUrl(String storagePath) {
        if (storagePath == null || storagePath.isBlank()) {
            return "";
        }
        if (isBlank(supabaseUrl)) {
            return "http://localhost/mock/" + storagePath;
        }
        String apiBase = trimTrailingSlash(supabaseUrl);
        return apiBase + "/storage/v1/object/public/" + bucket + "/" + storagePath;
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
        String mockUpload = "http://localhost/mock-upload/";
        if (s.startsWith(mockUpload)) {
            return s.substring(mockUpload.length());
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
