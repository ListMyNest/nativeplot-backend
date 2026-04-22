package com.listmynest.service;

import com.listmynest.model.Admin;
import com.listmynest.model.AdminAction;
import com.listmynest.model.AdminAuditLog;
import com.listmynest.model.EntityType;
import com.listmynest.repository.AdminAuditLogRepository;
import com.listmynest.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminAuditService {

    public static final String LISTING_ACTIVATED = "LISTING_ACTIVATED";
    public static final String LISTING_REJECTED = "LISTING_REJECTED";
    public static final String LISTING_STATUS_CHANGED = "LISTING_STATUS_CHANGED";
    public static final String AGENT_CREATED = "AGENT_CREATED";
    public static final String AGENT_UPDATED = "AGENT_UPDATED";
    public static final String AGENT_DEACTIVATED = "AGENT_DEACTIVATED";
    public static final String SELLER_CREATED = "SELLER_CREATED";
    public static final String SELLER_UPDATED = "SELLER_UPDATED";
    public static final String IMPERSONATION_START = "IMPERSONATION_START";
    public static final String IMPERSONATION_END = "IMPERSONATION_END";
    public static final String BUYER_VIEWED = "BUYER_VIEWED";

    private final AdminAuditLogRepository auditLogRepository;
    private final AdminRepository adminRepository;

    public void log(UUID adminId, String action, String entityType, UUID entityId, String notes) {
        try {
            Admin admin = adminRepository.findById(adminId).orElse(null);
            if (admin == null) {
                log.warn("Audit log skipped: admin {} not found", adminId);
                return;
            }
            AdminAction aa = AdminAction.valueOf(action);
            EntityType et = null;
            if (entityType != null && !entityType.isBlank()) {
                et = EntityType.valueOf(entityType);
            }
            AdminAuditLog row = AdminAuditLog.builder()
                    .admin(admin)
                    .action(aa)
                    .entityType(et)
                    .entityId(entityId)
                    .notes(notes)
                    .build();
            auditLogRepository.save(row);
            log.info(
                    "ADMIN_ACTION admin={} action={} entity={} id={}",
                    adminId,
                    action,
                    entityType == null ? "" : entityType,
                    entityId == null ? "" : entityId
            );
        } catch (Exception e) {
            log.error("Audit log failed for action {}: {}", action, e.getMessage());
        }
    }
}
