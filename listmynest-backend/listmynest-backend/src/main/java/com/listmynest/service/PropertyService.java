package com.listmynest.service;

import com.listmynest.dto.PageResponse;
import com.listmynest.dto.PropertyDetailDTO;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.PropertyType;
import com.listmynest.repository.PropertyRepository;
import jakarta.persistence.criteria.Predicate;
import com.listmynest.util.LogMaskUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyListingAssembler propertyListingAssembler;
    private final RedisService redisService;

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
        List<PublicPropertyDTO> content =
                result.getContent().stream().map(propertyListingAssembler::toPublicDto).toList();
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
        List<PublicPropertyDTO> content =
                result.getContent().stream().map(propertyListingAssembler::toPublicDto).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PropertyDetailDTO getPublicDetailById(UUID id) {
        Property p = propertyRepository.findById(id)
                .orElseThrow(() -> new AppException(404, "PROPERTY_NOT_FOUND"));
        if (!isPubliclyVisibleDetail(p)) {
            throw new AppException(404, "PROPERTY_NOT_FOUND");
        }
        return propertyListingAssembler.toDetailDto(p);
    }

    /**
     * Records a listing view (deduped per session per property per 24h). Uses Redis aggregates when
     * available; otherwise increments the DB counter directly. No-op for unknown or non-public listings.
     */
    @Transactional
    public void recordPublicView(UUID propertyId, String sessionHash) {
        String session = StringUtils.hasText(sessionHash) ? sessionHash.trim() : "anon";
        Property p = propertyRepository.findById(propertyId).orElse(null);
        if (p == null || !isPubliclyVisibleDetail(p)) {
            return;
        }
        String dedupeKey = "view_dedupe:" + session + ":" + propertyId;
        Long hit = redisService.increment(dedupeKey);
        if (hit == null) {
            propertyRepository.incrementViewCount(propertyId, 1);
            return;
        }
        if (hit == 1L) {
            redisService.expire(dedupeKey, 86400);
        }
        if (hit > 1L) {
            return;
        }
        log.info(
                "PROPERTY_VIEWED id={} city={} session={}",
                propertyId,
                p.getCity(),
                LogMaskUtil.shortHash(session)
        );
        Long agg = redisService.increment("view_count:" + propertyId);
        if (agg == null) {
            propertyRepository.incrementViewCount(propertyId, 1);
        }
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
}
