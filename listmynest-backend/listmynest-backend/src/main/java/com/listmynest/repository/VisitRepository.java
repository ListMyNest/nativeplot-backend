package com.listmynest.repository;

import com.listmynest.model.Visit;
import com.listmynest.model.VisitStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface VisitRepository extends JpaRepository<Visit, UUID>, JpaSpecificationExecutor<Visit> {

    List<Visit> findByPropertySellerIdOrderByVisitDateAscVisitTimeAsc(UUID sellerId);

    Page<Visit> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<Visit> findByAgentIdAndVisitDate(UUID agentId, LocalDate date);

    List<Visit> findByAgentIdAndStatus(UUID agentId, VisitStatus status);

    List<Visit> findByVisitDateAndStatusAndPostVisitWaSentFalse(LocalDate date, VisitStatus status);

    List<Visit> findByVisitDateAndStatusIn(LocalDate visitDate, Collection<VisitStatus> statuses);

    long countByAgent_Id(UUID agentId);

    long countByAgent_IdAndVisitDate(UUID agentId, LocalDate visitDate);

    long countByAgent_IdAndStatus(UUID agentId, VisitStatus status);
}
