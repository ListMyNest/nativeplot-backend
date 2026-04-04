package com.listmynest.controller;

import com.listmynest.dto.PhotoDTO;
import com.listmynest.dto.RegisterPhotoRequest;
import com.listmynest.dto.UploadUrlRequest;
import com.listmynest.dto.UploadUrlResponse;
import com.listmynest.exception.AppException;
import com.listmynest.service.PropertyPhotoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/*
  Frontend photo upload flow:
  1. Call POST /upload-url to get a signed Supabase URL
  2. PUT the image file directly to that signed URL from the browser/mobile
  3. Call POST / to register the storageUrl in the database

  Mobile HTML input for camera + gallery (both allowed):
  <input type="file" accept="image/*" capture="environment" />
  Note: capture="environment" prefers camera on mobile but gallery is also accessible.
  This satisfies PRD requirement: sellers can upload from gallery OR camera.
*/
@RestController
@RequestMapping("/v1/properties/{propertyId}/photos")
@RequiredArgsConstructor
@Slf4j
public class PhotoUploadController {

    private final PropertyPhotoService propertyPhotoService;

    @PostMapping("/upload-url")
    public UploadUrlResponse uploadUrl(
            @PathVariable UUID propertyId,
            @Valid @RequestBody UploadUrlRequest body
    ) {
        return propertyPhotoService.createSignedUploadUrl(propertyId, body.fileName(), currentSellerId());
    }

    @PostMapping
    public PhotoDTO register(
            @PathVariable UUID propertyId,
            @Valid @RequestBody RegisterPhotoRequest body
    ) {
        return propertyPhotoService.registerPhoto(propertyId, body, currentSellerId());
    }

    @DeleteMapping("/{photoId}")
    public void delete(@PathVariable UUID propertyId, @PathVariable UUID photoId) {
        propertyPhotoService.deletePhoto(propertyId, photoId, currentSellerId());
    }

    @PatchMapping("/{photoId}/primary")
    public PhotoDTO setPrimary(@PathVariable UUID propertyId, @PathVariable UUID photoId) {
        return propertyPhotoService.setPrimary(propertyId, photoId, currentSellerId());
    }

    private static UUID currentSellerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null) {
            throw new AppException(401, "UNAUTHORIZED");
        }
        Object p = auth.getPrincipal();
        if (!(p instanceof String s) || s.isBlank()) {
            throw new AppException(401, "UNAUTHORIZED");
        }
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            throw new AppException(401, "UNAUTHORIZED");
        }
    }
}
