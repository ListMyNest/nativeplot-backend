package com.listmynest.controller;

import com.listmynest.dto.ApiResponse;
import com.listmynest.dto.SaveRequest;
import com.listmynest.dto.SavedListingDTO;
import com.listmynest.exception.AppException;
import com.listmynest.service.SavedListingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1/saved")
@RequiredArgsConstructor
@Slf4j
public class SavedListingController {

    private final SavedListingService savedListingService;

    @PostMapping
    public ResponseEntity<SavedListingDTO> save(@Valid @RequestBody SaveRequest request) {
        SavedListingDTO dto = savedListingService.saveListing(currentBuyerId(), request.propertyId());
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @DeleteMapping("/{propertyId}")
    public ApiResponse remove(@PathVariable UUID propertyId) {
        savedListingService.removeSavedListing(currentBuyerId(), propertyId);
        return new ApiResponse(true, "Removed from saved");
    }

    @GetMapping
    public List<SavedListingDTO> list() {
        return savedListingService.getSavedListings(currentBuyerId());
    }

    private static UUID currentBuyerId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String s) || s.isBlank()) {
            throw new AppException(401, "UNAUTHORIZED");
        }
        try {
            return UUID.fromString(s);
        } catch (IllegalArgumentException e) {
            throw new AppException(401, "UNAUTHORIZED");
        }
    }
}
