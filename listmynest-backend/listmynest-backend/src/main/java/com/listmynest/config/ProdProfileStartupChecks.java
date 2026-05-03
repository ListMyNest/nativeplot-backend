package com.listmynest.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Fails fast on unsafe defaults when {@code prod} profile is active so the API does not
 * start with placeholder secrets (real-user deployments).
 */
@Component
@Profile("prod")
@Order(0)
public class ProdProfileStartupChecks implements ApplicationRunner {

    private final String jwtSecret;
    private final String datasourcePassword;
    private final String redisUrl;
    private final String msg91AuthKey;
    private final boolean allowSmsDisabled;

    public ProdProfileStartupChecks(
            @Value("${jwt.secret:}") String jwtSecret,
            @Value("${spring.datasource.password:}") String datasourcePassword,
            @Value("${spring.data.redis.url:}") String redisUrl,
            @Value("${msg91.auth-key:}") String msg91AuthKey,
            @Value("${listmynest.auth.allow-sms-disabled:false}") boolean allowSmsDisabled
    ) {
        this.jwtSecret = jwtSecret;
        this.datasourcePassword = datasourcePassword;
        this.redisUrl = redisUrl;
        this.msg91AuthKey = msg91AuthKey;
        this.allowSmsDisabled = allowSmsDisabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!StringUtils.hasText(jwtSecret) || jwtSecret.length() < 32) {
            throw new IllegalStateException(
                    "Production requires jwt.secret of at least 32 characters (set JWT_SECRET in the environment)."
            );
        }
        if (jwtSecret.contains("YOUR_JWT") || jwtSecret.toLowerCase().contains("changeme")) {
            throw new IllegalStateException(
                    "Production requires a real JWT secret — replace placeholder JWT_SECRET."
            );
        }
        if (!StringUtils.hasText(datasourcePassword)) {
            throw new IllegalStateException(
                    "Production requires spring.datasource.password (set SPRING_DATASOURCE_PASSWORD)."
            );
        }
        if (!StringUtils.hasText(redisUrl)
                || redisUrl.contains("YOUR_UPSTASH_TOKEN")
                || redisUrl.contains("YOUR_UPSTASH_HOST")) {
            throw new IllegalStateException(
                    "Production requires a real Redis URL (set SPRING_DATA_REDIS_URL)."
            );
        }
        if (!allowSmsDisabled && !StringUtils.hasText(msg91AuthKey)) {
            throw new IllegalStateException(
                    "Production requires MSG91_AUTH_KEY for SMS OTP. "
                            + "If you intentionally disable SMS OTP, set LISTMYNEST_AUTH_ALLOW_SMS_DISABLED=true "
                            + "(see listmynest.auth.allow-sms-disabled)."
            );
        }
    }
}
