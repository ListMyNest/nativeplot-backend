package com.listmynest.repository;

// ListMyNest — AgentRepository
// Phase A: Flyway → Entities → Repositories

import com.listmynest.model.Agent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AgentRepository extends JpaRepository<Agent, UUID> {
    Optional<Agent> findByPhone(String phone);

    boolean existsByPhone(String phone);

    boolean existsByWhatsappNumber(String whatsappNumber);

    Optional<Agent> findByWhatsappNumber(String whatsappNumber);

    @Query(
            value = "SELECT * FROM agents WHERE CAST(:city AS text) = ANY (assigned_cities) AND active = true",
            nativeQuery = true
    )
    List<Agent> findActiveByAssignedCity(@Param("city") String city);
}
