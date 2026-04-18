package com.listmynest.scheduler;

import com.listmynest.repository.PropertyRepository;
import com.listmynest.service.RedisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ViewCountFlushScheduler {

    private static final String PREFIX = "view_count:";

    private final PropertyRepository propertyRepository;
    private final RedisService redisService;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void flushViewCounts() {
        try {
            int flushed = 0;
            for (String key : redisService.scanKeys(PREFIX + "*")) {
                if (!key.startsWith(PREFIX)) {
                    continue;
                }
                String idPart = key.substring(PREFIX.length());
                UUID propertyId;
                try {
                    propertyId = UUID.fromString(idPart);
                } catch (IllegalArgumentException e) {
                    log.warn("Skipping invalid view_count key: {}", key);
                    continue;
                }
                String countStr = redisService.get(key);
                if (countStr == null || countStr.isBlank()) {
                    continue;
                }
                int count;
                try {
                    count = Integer.parseInt(countStr.trim());
                } catch (NumberFormatException e) {
                    log.warn("Skipping non-integer view_count for key {}: {}", key, countStr);
                    continue;
                }
                if (count <= 0) {
                    continue;
                }
                propertyRepository.incrementViewCount(propertyId, count);
                redisService.delete(key);
                flushed++;
            }
            log.info("Flushed view counts for {} properties", flushed);
        } catch (Exception e) {
            log.error("View count flush failed: {}", e.getMessage(), e);
        }
    }
}
