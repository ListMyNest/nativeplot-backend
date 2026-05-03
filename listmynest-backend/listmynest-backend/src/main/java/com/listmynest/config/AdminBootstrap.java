package com.listmynest.config;

import com.listmynest.model.Admin;
import com.listmynest.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Seeds a dev admin only outside {@code prod} — production must create admins via register + invite. */
@Component
@Profile("!prod")
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap implements ApplicationRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        String email = "admin@listmynest.local";
        if (adminRepository.findByEmail(email).isEmpty()) {
            Admin admin = Admin.builder()
                    .name("System Admin")
                    .email(email)
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .build();
            adminRepository.save(admin);
            log.info("Seeded default admin: {} / password: admin123 (change in production)", email);
        }
    }
}
