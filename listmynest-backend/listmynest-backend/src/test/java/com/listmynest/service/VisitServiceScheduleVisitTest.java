package com.listmynest.service;

import com.listmynest.exception.AppException;
import com.listmynest.model.Property;
import com.listmynest.model.PropertyStatus;
import com.listmynest.model.Visit;
import com.listmynest.repository.PropertyRepository;
import com.listmynest.repository.VisitRepository;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class VisitServiceScheduleVisitTest {

    private static Environment localEnv() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[] {"local"});
        return env;
    }

    private static Environment prodEnv() {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(new String[] {"prod"});
        return env;
    }

    @Test
    void localProfile_allowsPendingReview() {
        UUID pid = UUID.randomUUID();

        VisitRepository visits = mock(VisitRepository.class);
        PropertyRepository props = mock(PropertyRepository.class);
        LeadService leads = mock(LeadService.class);
        WhatsAppService wa = mock(WhatsAppService.class);
        NotificationService notif = mock(NotificationService.class);

        Property p = Property.builder().id(pid).status(PropertyStatus.PENDING_REVIEW).city("Bidar").build();
        when(props.findById(pid)).thenReturn(Optional.of(p));
        when(visits.save(any(Visit.class))).thenAnswer(inv -> {
            Visit v = inv.getArgument(0);
            if (v.getId() == null) v.setId(UUID.randomUUID());
            if (v.getCreatedAt() == null) v.setCreatedAt(java.time.Instant.now());
            return v;
        });
        when(props.save(any(Property.class))).thenAnswer(inv -> inv.getArgument(0));

        VisitService svc = new VisitService(visits, props, leads, wa, notif, localEnv());
        var dto = svc.scheduleVisit(pid, LocalDate.now().plusDays(1), LocalTime.of(10, 0), "+919876543210");
        assertNotNull(dto);
        assertEquals(pid, dto.propertyId());
        assertEquals("SCHEDULED", dto.status());
    }

    @Test
    void prodProfile_blocksPendingReview() {
        UUID pid = UUID.randomUUID();

        VisitRepository visits = mock(VisitRepository.class);
        PropertyRepository props = mock(PropertyRepository.class);
        LeadService leads = mock(LeadService.class);
        WhatsAppService wa = mock(WhatsAppService.class);
        NotificationService notif = mock(NotificationService.class);

        Property p = Property.builder().id(pid).status(PropertyStatus.PENDING_REVIEW).city("Bidar").build();
        when(props.findById(pid)).thenReturn(Optional.of(p));

        VisitService svc = new VisitService(visits, props, leads, wa, notif, prodEnv());
        AppException ex = assertThrows(
                AppException.class,
                () -> svc.scheduleVisit(pid, LocalDate.now().plusDays(1), LocalTime.of(10, 0), "+919876543210")
        );
        assertEquals("PROPERTY_NOT_ACTIVE", ex.getMessage());
    }
}

