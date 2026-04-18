package com.listmynest.scheduler;

import com.listmynest.service.PropertyLifecycleJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PropertyLifecycleScheduler {

    private final PropertyLifecycleJobService propertyLifecycleJobService;

    @Scheduled(cron = "0 0 8 * * *")
    public void runLifecycleChecks() {
        int warnCount = 0;
        int inactiveCount = 0;
        int archivedCount = 0;

        try {
            warnCount = propertyLifecycleJobService.runThirtyDayWarning();
        } catch (Exception e) {
            log.error("30-day inactivity check failed: {}", e.getMessage(), e);
        }

        try {
            inactiveCount = propertyLifecycleJobService.runFortyFiveDayInactive();
        } catch (Exception e) {
            log.error("45-day auto-inactive check failed: {}", e.getMessage(), e);
        }

        try {
            archivedCount = propertyLifecycleJobService.runSoldBadgeExpiry();
        } catch (Exception e) {
            log.error("Sold badge expiry check failed: {}", e.getMessage(), e);
        }

        log.info("Lifecycle checks complete. Warned: {}, Inactivated: {}, Archived: {}",
                warnCount, inactiveCount, archivedCount);
    }
}
