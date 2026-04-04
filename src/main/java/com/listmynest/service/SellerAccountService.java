package com.listmynest.service;

import com.listmynest.dto.AdminSellerDTO;
import com.listmynest.dto.PublicPropertyDTO;
import com.listmynest.dto.SellerDashboardDTO;
import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.repository.LeadRepository;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.repository.SellerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SellerAccountService {

    private static final DateTimeFormatter ISO_INSTANT = DateTimeFormatter.ISO_INSTANT;

    private final SellerRepository sellerRepository;
    private final PropertyRepository propertyRepository;
    private final LeadRepository leadRepository;

    @Transactional(readOnly = true)
    public AdminSellerDTO getMe(UUID sellerId) {
        var seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new AppException(404, "SELLER_NOT_FOUND"));
        long listings = propertyRepository.countBySeller_Id(sellerId);
        return new AdminSellerDTO(
                seller.getId(),
                seller.getName() == null ? "" : seller.getName(),
                seller.getPhone(),
                listings,
                ISO_INSTANT.format(seller.getCreatedAt().truncatedTo(ChronoUnit.SECONDS))
        );
    }

    @Transactional(readOnly = true)
    public SellerDashboardDTO getDashboard(UUID sellerId) {
        if (!sellerRepository.existsById(sellerId)) {
            throw new AppException(404, "SELLER_NOT_FOUND");
        }
        long total = propertyRepository.countBySeller_Id(sellerId);
        long active = propertyRepository.countBySeller_IdAndStatus(sellerId, PropertyStatus.ACTIVE);
        long enquiries = leadRepository.countBySellerProperties(sellerId);
        long visits = propertyRepository.countVisitsForSellerProperties(sellerId);
        return new SellerDashboardDTO(total, active, enquiries, visits);
    }

    @Transactional(readOnly = true)
    public List<PublicPropertyDTO> getMyListings(UUID sellerId) {
        if (!sellerRepository.existsById(sellerId)) {
            throw new AppException(404, "SELLER_NOT_FOUND");
        }
        return propertyRepository.findBySeller_Id(sellerId).stream()
                .map(this::toPublicDto)
                .toList();
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
