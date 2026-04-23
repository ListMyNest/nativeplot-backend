package com.listmynest.service;

import com.listmynest.dto.CreatePropertyRequest;
import com.listmynest.exception.AppException;
import com.listmynest.model.Configuration;
import com.listmynest.model.Possession;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.PropertyType;
import com.listmynest.model.Seller;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SellerPropertyService {

    private static final BigDecimal LAKH_TO_RUPEE = new BigDecimal("100000");

    private final PropertyRepository propertyRepository;
    private final SellerRepository sellerRepository;
    private final Environment environment;
    private final GeocodingService geocodingService;

    @Transactional
    public UUID create(CreatePropertyRequest req, UUID sellerId) {
        Seller seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new AppException(401, "UNAUTHORIZED"));

        PropertyType type;
        try {
            type = PropertyType.valueOf(req.type().trim().toUpperCase());
        } catch (Exception e) {
            throw new AppException(400, "INVALID_PROPERTY_TYPE");
        }

        Configuration cfg = null;
        if (StringUtils.hasText(req.configuration())) {
            try {
                cfg = Configuration.valueOf(req.configuration().trim().toUpperCase());
            } catch (Exception e) {
                throw new AppException(400, "INVALID_CONFIGURATION");
            }
        }

        Possession pos = null;
        if (StringUtils.hasText(req.possession())) {
            try {
                pos = Possession.valueOf(req.possession().trim().toUpperCase());
            } catch (Exception e) {
                throw new AppException(400, "INVALID_POSSESSION");
            }
        }

        // UI sends prices in ₹ lakhs; DB and formatters use whole rupees.
        BigDecimal min = req.priceMin().multiply(LAKH_TO_RUPEE);
        BigDecimal max = req.priceMax().multiply(LAKH_TO_RUPEE);
        if (min.compareTo(BigDecimal.ZERO) <= 0 || max.compareTo(BigDecimal.ZERO) <= 0 || max.compareTo(min) < 0) {
            throw new AppException(400, "INVALID_PRICE");
        }

        Property p = Property.builder()
                .title(req.title().trim())
                .description(StringUtils.hasText(req.description()) ? req.description().trim() : null)
                .type(type)
                .city(req.city().trim())
                .locality(StringUtils.hasText(req.locality()) ? req.locality().trim() : null)
                .priceMin(min)
                .priceMax(max)
                .areaSqft(req.areaSqft())
                .configuration(cfg)
                .bathrooms(req.bathrooms())
                .possession(pos)
                .agent(seller.getPreferredAgent())
                .seller(seller)
                .build();

        // Best-effort approximate coordinates from locality + city (so buyer map works without asking lat/lng).
        try {
            String q = String.join(
                    ", ",
                    new String[] {
                            StringUtils.hasText(req.locality()) ? req.locality().trim() : "",
                            req.city().trim(),
                            "India"
                    }
            ).replaceAll("(^,\\s+|,\\s+,|,\\s+$)", "").trim();
            if (StringUtils.hasText(q)) {
                var ll = geocodingService.geocode(q).orElse(null);
                if (ll != null) {
                    p.setLat(ll.lat());
                    p.setLng(ll.lng());
                }
            }
        } catch (Exception ignored) {
            // Geocoding must never block listing creation.
        }

        p = propertyRepository.save(p);
        // Always gate public visibility behind admin approval.
        // (Admin sets ACTIVE to approve; reject/unpublish should move to INACTIVE.)
        p.setStatus(PropertyStatus.PENDING_REVIEW);
        p.setVerified(false);
        p = propertyRepository.save(p);
        log.info(
                "PROPERTY_CREATED id={} city={} type={} seller={}",
                p.getId(),
                p.getCity(),
                p.getType().name(),
                sellerId
        );
        return p.getId();
    }
}

