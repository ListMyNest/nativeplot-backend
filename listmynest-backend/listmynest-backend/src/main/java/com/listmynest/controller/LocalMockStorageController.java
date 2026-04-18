package com.listmynest.controller;

import com.listmynest.storage.LocalMockStoragePaths;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Accepts browser PUT uploads when {@link com.listmynest.service.StorageService} returns
 * {@code /mock-upload/...} URLs (local dev: no Supabase or publishable key only).
 */
@Profile("local")
@RestController
@Slf4j
public class LocalMockStorageController {

    private static final String PREFIX = "/mock-upload/";

    @PutMapping("/mock-upload/**")
    public ResponseEntity<Void> upload(HttpServletRequest request, @RequestBody(required = false) byte[] body)
            throws IOException {
        Path file = resolveUnderRoot(request);
        Files.createDirectories(file.getParent());
        Files.write(file, body != null ? body : new byte[0]);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/mock-upload/**")
    public ResponseEntity<byte[]> download(HttpServletRequest request) throws IOException {
        Path file = resolveUnderRoot(request);
        if (!Files.isRegularFile(file)) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = Files.readAllBytes(file);
        String name = file.getFileName().toString();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentTypeForFileName(name))
                .body(bytes);
    }

    private static Path resolveUnderRoot(HttpServletRequest request) {
        String uri = request.getRequestURI();
        int idx = uri.indexOf(PREFIX);
        if (idx < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mock path");
        }
        String relative = uri.substring(idx + PREFIX.length());
        if (relative.isEmpty() || relative.contains("..")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid mock path");
        }
        Path root = LocalMockStoragePaths.ROOT.normalize();
        Path target = root.resolve(relative).normalize();
        if (!target.startsWith(root)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Path escapes storage root");
        }
        return target;
    }

    private static String contentTypeForFileName(String name) {
        String lower = name.toLowerCase();
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG_VALUE;
        }
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG_VALUE;
        }
        if (lower.endsWith(".webp")) {
            return "image/webp";
        }
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }
}
