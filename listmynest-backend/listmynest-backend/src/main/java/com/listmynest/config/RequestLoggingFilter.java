package com.listmynest.config;

import com.listmynest.util.LogMaskUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Logs each HTTP operation with a short correlation id ({@code rid} in MDC / log pattern).
 * Success → INFO; client/server errors → WARN with status for quick scanning.
 */
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (shouldSkip(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String rid = UUID.randomUUID().toString().substring(0, 8);
        MDC.put("rid", rid);

        String method = request.getMethod();
        String maskedPath = LogMaskUtil.maskDigitsInPath(path);
        String ip = clientIp(request);
        long size = request.getContentLengthLong();
        long start = System.currentTimeMillis();
        log.info("HTTP_BEGIN {} {} ip={} bytes={}", method, maskedPath, ip, size);

        try {
            filterChain.doFilter(request, response);
        } finally {
            long ms = System.currentTimeMillis() - start;
            int status = response.getStatus();
            if (status >= 500) {
                log.warn("HTTP_END {} {} status={} duration={}ms", method, maskedPath, status, ms);
            } else if (status >= 400) {
                log.warn("HTTP_END {} {} status={} duration={}ms (client or auth error — see exception logs above)", method, maskedPath, status, ms);
            } else {
                log.info("HTTP_END {} {} status={} duration={}ms", method, maskedPath, status, ms);
            }
            MDC.remove("rid");
        }
    }

    private static boolean shouldSkip(String path) {
        if (path == null) {
            return true;
        }
        if (path.equals("/actuator/health") || path.startsWith("/actuator/health/")) {
            return true;
        }
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs")) {
            return true;
        }
        return false;
    }

    private static String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            int comma = xff.indexOf(',');
            return comma > 0 ? xff.substring(0, comma).trim() : xff.trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
