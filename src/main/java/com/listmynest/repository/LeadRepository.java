package com.listmynest.repository;

import com.listmynest.model.Lead;
import com.listmynest.model.LeadActionType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LeadRepository extends JpaRepository<Lead, UUID>, JpaSpecificationExecutor<Lead> {

    boolean existsByPropertyIdAndSessionHashAndActionTypeAndCreatedAtAfter(
            UUID propertyId,
            String sessionHash,
            LeadActionType actionType,
            Instant createdAtAfter
    );

    List<Lead> findByAgentId(UUID agentId, Pageable pageable);

    Optional<Lead> findFirstByAgent_IdAndActionTypeAndBuyerPhoneIsNullOrderByCreatedAtDesc(
            UUID agentId,
            LeadActionType actionType
    );

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.property IS NOT NULL AND l.property.seller.id = :sellerId")
    long countBySellerProperties(@Param("sellerId") UUID sellerId);

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.property IS NOT NULL AND l.property.seller.id = :sellerId AND l.actionType = :type")
    long countBySellerPropertiesAndActionType(@Param("sellerId") UUID sellerId, @Param("type") LeadActionType type);

    default Optional<Lead> findUnresolvedWaLeadsByAgent(UUID agentId) {
        return findFirstByAgent_IdAndActionTypeAndBuyerPhoneIsNullOrderByCreatedAtDesc(agentId, LeadActionType.WHATSAPP);
    }

    long countByAgent_Id(UUID agentId);

    long countByAgent_IdAndActionType(UUID agentId, LeadActionType actionType);

    @Query("SELECT COUNT(l) FROM Lead l WHERE l.agent.id = :agentId AND l.createdAt >= :since")
    long countByAgent_IdAndCreatedAtAfter(@Param("agentId") UUID agentId, @Param("since") Instant since);
}
