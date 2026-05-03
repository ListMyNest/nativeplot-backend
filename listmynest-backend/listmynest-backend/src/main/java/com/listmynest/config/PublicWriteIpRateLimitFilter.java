package com.listmynest.config;

import com.listmynest.service.IpWindowRateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Extra abuse protection on sensitive public POST endpoints (per client IP).
 * Complements per-phone OTP limits in {@code AuthService} / {@code BuyerAuthService}
 * and per-session limits in {@code LeadService}.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
@Slf4j
public class PublicWriteIpRateLimitFilter extends OncePerRequestFilter {

    private final IpWindowRateLimiter ipWindowRateLimiter;

    @Value("${listmynest.rate-limit.ip.post-leads-per-hour:200}")
    private int postLeadsPerHour;

    @Value("${listmynest.rate-limit.ip.post-visits-per-hour:120}")
    private int postVisitsPerHour;

    @Value("${listmynest.rate-limit.ip.post-notify-me-per-hour:40}")
    private int postNotifyMePerHour;

    @Value("${listmynest.rate-limit.ip.admin-login-per-15m:40}")
    private int adminLoginPer15m;

    @Value("${listmynest.rate-limit.ip.admin-register-per-hour:20}")
    private int adminRegisterPerHour;

    @Value("${listmynest.rate-limit.ip.otp-send-per-hour:40}")
    private int otpSendPerHour;

    @Value("${listmynest.rate-limit.ip.password-login-per-hour:80}")
    private int passwordLoginPerHour;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        return !(
                "/v1/leads".equals(path)
                        || "/v1/visits".equals(path)
                        || "/v1/notify-me".equals(path)
                        || "/v1/admin/auth/login".equals(path)
                        || "/v1/admin/auth/register".equals(path)
                        || "/v1/auth/otp/send".equals(path)
                        || "/v1/buyers/otp/send".equals(path)
                        || "/v1/auth/password/login".equals(path)
        );
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String ip = clientIp(request);
        String path = request.getRequestURI();
        String safeIp = ip.replace(':', '_');

        boolean ok = switch (path) {
            case "/v1/leads" -> ipWindowRateLimiter.allow("rl:ip:leads:" + safeIp, postLeadsPerHour, 3600);
            case "/v1/visits" -> ipWindowRateLimiter.allow("rl:ip:visits:" + safeIp, postVisitsPerHour, 3600);
            case "/v1/notify-me" -> ipWindowRateLimiter.allow("rl:ip:notify:" + safeIp, postNotifyMePerHour, 3600);
            case "/v1/admin/auth/login" -> ipWindowRateLimiter.allow("rl:ip:admin_login:" + safeIp, adminLoginPer15m, 900);
            case "/v1/admin/auth/register" -> ipWindowRateLimiter.allow("rl:ip:admin_reg:" + safeIp, adminRegisterPerHour, 3600);
            case "/v1/auth/otp/send", "/v1/buyers/otp/send" -> ipWindowRateLimiter.allow("rl:ip:otp_send:" + safeIp, otpSendPerHour, 3600);
            case "/v1/auth/password/login" -> ipWindowRateLimiter.allow("rl:ip:pwd_login:" + safeIp, passwordLoginPerHour, 3600);
            default -> true;
        };

        if (!ok) {
            response.setStatus(429);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            byte[] body = "{\"success\":false,\"message\":\"RATE_LIMIT_EXCEEDED\",\"fieldErrors\":null}"
                    .getBytes(StandardCharsets.UTF_8);
            response.setContentLength(body.length);
            response.getOutputStream().write(body);
            return;
        }
        filterChain.doFilter(request, response);
    }

    static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            String first = comma > 0 ? xff.substring(0, comma) : xff;
            return first.trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
