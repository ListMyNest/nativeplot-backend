package com.listmynest.service;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.beans.factory.annotation.Value;
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
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final PropertyListingAssembler propertyListingAssembler;
    private final RedisService redisService;
    private final ObjectMapper objectMapper;

    @Value("${listmynest.cache.public-listings-ttl-seconds:0}")
    private int publicListingsCacheTtlSeconds;

    private JavaType pagePublicJavaType() {
        return objectMapper.getTypeFactory().constructParametricType(PageResponse.class, PublicPropertyDTO.class);
    }

    private Optional<PageResponse<PublicPropertyDTO>> readPublicListingCache(String key) {
        if (publicListingsCacheTtlSeconds <= 0) {
            return Optional.empty();
        }
        try {
            String json = redisService.get(key);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(objectMapper.readValue(json, pagePublicJavaType()));
        } catch (Exception e) {
            log.warn("Public listing cache read failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private void writePublicListingCache(String key, PageResponse<PublicPropertyDTO> page) {
        if (publicListingsCacheTtlSeconds <= 0) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(page);
            redisService.set(key, json, publicListingsCacheTtlSeconds);
        } catch (Exception e) {
            log.warn("Public listing cache write failed: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicPropertyDTO> listPublicProperties(
            String city,
            String type,
            BigDecimal priceMin,
            BigDecimal priceMax,
            int page,
            int size
    ) {
        int p = Math.max(0, page);
        int s = Math.min(100, Math.max(1, size));
        String cacheKey = "listing:public:list:v1:"
                + (city == null ? "" : city.trim().toLowerCase())
                + "|" + (type == null ? "" : type.trim().toUpperCase())
                + "|" + (priceMin == null ? "" : priceMin.toPlainString())
                + "|" + (priceMax == null ? "" : priceMax.toPlainString())
                + "|" + p + "|" + s;
        Optional<PageResponse<PublicPropertyDTO>> cached = readPublicListingCache(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        Specification<Property> spec = publicListingSpec(city, type, priceMin, priceMax);
        Page<Property> result = propertyRepository.findAll(
                spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<PublicPropertyDTO> content =
                result.getContent().stream().map(propertyListingAssembler::toPublicDto).toList();
        PageResponse<PublicPropertyDTO> out = new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
        writePublicListingCache(cacheKey, out);
        return out;
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicPropertyDTO> searchPublicProperties(
            String q,
            String city,
            int page,
            int size
    ) {
        String query = q == null ? "" : q.trim();
        if (query.isEmpty()) {
            return new PageResponse<>(List.of(), Math.max(0, page), Math.min(100, Math.max(1, size)), 0);
        }
        String like = "%" + query.toLowerCase() + "%";
        Specification<Property> spec = (root, jpaQuery, cb) -> {
            List<Predicate> parts = new ArrayList<>();
            parts.add(cb.equal(root.get("status"), PropertyStatus.ACTIVE));
            parts.add(cb.or(
                    cb.like(cb.lower(root.get("title")), like),
                    cb.like(cb.lower(root.get("description")), like)
            ));
            if (StringUtils.hasText(city)) {
                parts.add(cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase()));
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };
        int p = Math.max(0, page);
        int s = Math.min(100, Math.max(1, size));
        String cacheKey = "listing:public:search:v1:"
                + query.toLowerCase()
                + "|" + (city == null ? "" : city.trim().toLowerCase())
                + "|" + p + "|" + s;
        Optional<PageResponse<PublicPropertyDTO>> cached = readPublicListingCache(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        Page<Property> result = propertyRepository.findAll(
                spec,
                PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        List<PublicPropertyDTO> content =
                result.getContent().stream().map(propertyListingAssembler::toPublicDto).toList();
        PageResponse<PublicPropertyDTO> out = new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
        writePublicListingCache(cacheKey, out);
        return out;
    }

    @Transactional(readOnly = true)
    public PageResponse<PublicPropertyDTO> listFeaturedProperties(String city, int page, int size) {
        Specification<Property> spec = (root, query, cb) -> {
            List<Predicate> parts = new ArrayList<>();
            parts.add(cb.equal(root.get("status"), PropertyStatus.ACTIVE));
            parts.add(cb.isTrue(root.get("verified")));
            if (StringUtils.hasText(city)) {
                parts.add(cb.equal(cb.lower(root.get("city")), city.trim().toLowerCase()));
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };
        int p = Math.max(0, page);
        int s = Math.min(100, Math.max(1, size));
        String cacheKey = "listing:public:featured:v1:"
                + (city == null ? "" : city.trim().toLowerCase())
                + "|" + p + "|" + s;
        Optional<PageResponse<PublicPropertyDTO>> cached = readPublicListingCache(cacheKey);
        if (cached.isPresent()) {
            return cached.get();
        }

        Page<Property> result = propertyRepository.findAll(
                spec,
                // Home should surface newly-approved listings; use recency first.
                PageRequest.of(
                        p,
                        s,
                        Sort.by(Sort.Direction.DESC, "createdAt")
                                .and(Sort.by(Sort.Direction.DESC, "viewCount"))
                )
        );
        List<PublicPropertyDTO> content =
                result.getContent().stream().map(propertyListingAssembler::toPublicDto).toList();
        PageResponse<PublicPropertyDTO> out = new PageResponse<>(content, result.getNumber(), result.getSize(), result.getTotalElements());
        writePublicListingCache(cacheKey, out);
        return out;
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
                String t = type.trim().toUpperCase();
                if ("RENT".equals(t)) {
                    parts.add(root.get("type").in(PropertyType.RENT_HOME, PropertyType.RENT_COMMERCIAL));
                } else {
                    PropertyType propertyType;
                    try {
                        propertyType = PropertyType.valueOf(t);
                    } catch (IllegalArgumentException e) {
                        throw new AppException(400, "INVALID_PROPERTY_TYPE");
                    }
                    parts.add(cb.equal(root.get("type"), propertyType));
                }
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
