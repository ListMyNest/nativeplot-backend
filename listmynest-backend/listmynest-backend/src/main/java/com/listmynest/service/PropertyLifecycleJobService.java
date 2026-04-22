package com.listmynest.service;

import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class PropertyLifecycleJobService {

    private static final String JOB = "PropertyLifecycleJobService";

    private final PropertyRepository propertyRepository;
    private final RedisService redisService;
    private final MSG91Service msg91Service;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    @Transactional
    public int runThirtyDayWarning() {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(30L * 24 * 60 * 60);
        int n = 0;
        for (Property property : propertyRepository.findByStatusAndLastActivityAtBefore(PropertyStatus.ACTIVE, cutoff)) {
            String redisKey = "prop_inactive_warn:" + property.getId();
            if (redisService.exists(redisKey)) {
                continue;
            }
            String msg = "Your listing " + property.getTitle() + " on ListMyNest has had no activity for 30 days. "
                    + "Login to keep it active or mark as Sold: " + appBaseUrl + "/seller/dashboard";
            if (property.getSeller() != null && property.getSeller().getPhone() != null) {
                msg91Service.sendSms(property.getSeller().getPhone(), msg);
            } else {
                log.warn("30-day warning skipped — no seller phone for property {}", property.getId());
            }
            redisService.set(redisKey, "{\"notified_at\":\"" + now + "\"}", 1296000);
            log.warn(
                    "SCHEDULER_ACTION job={} property={} action=THIRTY_DAY_INACTIVITY_WARNING",
                    JOB,
                    property.getId()
            );
            n++;
        }
        return n;
    }

    @Transactional
    public int runFortyFiveDayInactive() {
        Instant now = Instant.now();
        Instant cutoff = now.minusSeconds(45L * 24 * 60 * 60);
        int n = 0;
        for (Property property : propertyRepository.findByStatusAndLastActivityAtBefore(PropertyStatus.ACTIVE, cutoff)) {
            property.setStatus(PropertyStatus.INACTIVE);
            property.setUpdatedAt(now);
            propertyRepository.save(property);
            String msg = "Your listing " + property.getTitle()
                    + " has been marked inactive after 45 days of no activity. Login to reactivate: "
                    + appBaseUrl + "/seller/dashboard";
            if (property.getSeller() != null && property.getSeller().getPhone() != null) {
                msg91Service.sendSms(property.getSeller().getPhone(), msg);
            } else {
                log.warn("45-day inactive SMS skipped — no seller phone for property {}", property.getId());
            }
            log.warn(
                    "SCHEDULER_ACTION job={} property={} action=AUTO_INACTIVE_45_DAY",
                    JOB,
                    property.getId()
            );
            n++;
        }
        return n;
    }

    @Transactional
    public int runSoldBadgeExpiry() {
        Instant cutoff = Instant.now().minusSeconds(48L * 60 * 60);
        int n = 0;
        for (Property property : propertyRepository.findByStatusAndSoldAtBefore(PropertyStatus.SOLD, cutoff)) {
            property.setStatus(PropertyStatus.ARCHIVED);
            propertyRepository.save(property);
            log.warn(
                    "SCHEDULER_ACTION job={} property={} action=ARCHIVE_SOLD_BADGE_EXPIRED",
                    JOB,
                    property.getId()
            );
            n++;
        }
        return n;
    }
}
