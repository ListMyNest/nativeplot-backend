package com.listmynest.service;

import com.listmynest.dto.PageResponse;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.PropertyType;
import com.listmynest.repository.PropertyRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PropertyService {

    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final PropertyRepository propertyRepository;

    @Transactional(readOnly = true)
    public PageResponse<PublicPropertyDTO> listPublicProperties(
            String city,
            String type,
            BigDecimal priceMin,
            BigDecimal priceMax,
            int page,
            int size
    ) {
        Specification<Property> spec = publicListingSpec(city, type, priceMin, priceMax);
        int p = Math.max(0, page);
        int s = Math.min(100, Math.max(1, size));
        Page<Property> result = propertyRepository.findAll(
                spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<PublicPropertyDTO> content = result.getContent().stream().map(this::toPublicDto).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicPropertyDTO> listFeaturedProperties(int page, int size) {
        Specification<Property> spec = (root, query, cb) -> cb.and(
                cb.equal(root.get("status"), PropertyStatus.ACTIVE),
                cb.isTrue(root.get("verified"))
        );
        int p = Math.max(0, page);
        int s = Math.min(100, Math.max(1, size));
        Page<Property> result = propertyRepository.findAll(
                spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "viewCount").and(Sort.by(Sort.Direction.DESC, "createdAt")))
        );
        List<PublicPropertyDTO> content = result.getContent().stream().map(this::toPublicDto).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PublicPropertyDTO getPublicById(UUID id) {
        Property p = propertyRepository.findById(id)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));
        if (!isPubliclyVisibleDetail(p)) {
            throw new AppException(404, "PROPERTY_NOT_FOUND");
        }
        return toPublicDto(p);
    }

    private Specification<Property> publicListingSpec(
            String city,
            String type,
            BigDecimal priceMin,
            BigDecimal priceMax
    ) {
        return (root, query, cb) -> {
            List<Predicate> parts = new ArrayList<>();
            parts.add(cb.equal(root.get("status"), PropertyStatus.ACTIVE));

            if (StringUtils.hasText(city)) {
                parts.add(cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase()));
            }
            if (StringUtils.hasText(type)) {
                PropertyType propertyType;
                try {
                    propertyType = PropertyType.valueOf(type.trim().toUpperCase());
                } catch (IllegalArgumentException e) {
                    throw new AppException(400, "INVALID_PROPERTY_TYPE");
                }
                parts.add(cb.equal(root.get("type"), propertyType));
            }
            if (priceMin != null && priceMax != null) {
                parts.add(cb.lessThanOrEqualTo(root.get("priceMin"), priceMax));
                parts.add(cb.greaterThanOrEqualTo(root.get("priceMax"), priceMin));
            } else if (priceMin != null) {
                parts.add(cb.greaterThanOrEqualTo(root.get("priceMax"), priceMin));
            } else if (priceMax != null) {
                parts.add(cb.lessThanOrEqualTo(root.get("priceMin"), priceMax));
            }

            return cb.and(parts.toArray(Predicate[]::new));
        };
    }

    private static boolean isPubliclyVisibleDetail(Property p) {
        if (p.getStatus() == PropertyStatus.ACTIVE) {
            return true;
        }
        if (p.getStatus() == PropertyStatus.SOLD && p.getSoldAt() != null) {
            Instant cutoff = Instant.now().minus(48, ChronoUnit.HOURS);
            return !p.getSoldAt().isBefore(cutoff);
        }
        return false;
    }

    private PublicPropertyDTO toPublicDto(Property p) {
        return new PublicPropertyDTO(
                p.getId(),
                p.getTitle(),
                p.getType().name(),
                p.getCity(),
                p.getLocality(),
                p.getPriceMin(),
                p.getPriceMax(),
                p.getStatus().name(),
                p.getVerified(),
                p.getViewCount(),
                ISO_INSTANT.format(p.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
        );
    }
}
