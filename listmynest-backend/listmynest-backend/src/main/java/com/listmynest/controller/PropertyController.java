package com.listmynest.controller;

import com.listmynest.dto.PageResponse;
import com.listmynest.dto.PropertyDetailDTO;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.dto.RecordPropertyViewRequest;
import com.listmynest.service.PropertyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class PropertyController {

    private final PropertyService propertyService;

    @GetMapping("/properties/featured")
    public PageResponse<PublicPropertyDTO> getFeatured(
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return propertyService.listFeaturedProperties(city, page, size);
    }

    @GetMapping("/properties")
    public PageResponse<PublicPropertyDTO> getProperties(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String type,
            @RequestParam(name = "price_min", required = false) BigDecimal priceMin,
            @RequestParam(name = "price_max", required = false) BigDecimal priceMax,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return propertyService.listPublicProperties(city, type, priceMin, priceMax, page, size);
    }

    @GetMapping("/properties/search")
    public PageResponse<PublicPropertyDTO> searchProperties(
            @RequestParam(name = "q") String q,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return propertyService.searchPublicProperties(q, city, page, size);
    }

    @GetMapping("/properties/{id}")
    public PropertyDetailDTO getProperty(@PathVariable UUID id) {
        return propertyService.getPublicDetailById(id);
    }

    @PostMapping("/properties/{id}/view")
    public ResponseEntity<Void> recordView(
            @PathVariable UUID id,
            @Valid @RequestBody RecordPropertyViewRequest body
    ) {
        propertyService.recordPublicView(id, body.sessionHash());
        return ResponseEntity.noContent().build();
    }
}
