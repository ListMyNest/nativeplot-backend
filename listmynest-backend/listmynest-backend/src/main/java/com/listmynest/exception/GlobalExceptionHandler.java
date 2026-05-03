package com.listmynest.exception;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Arrays;
import java.util.List;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    private final Environment environment;

    /**
     * When true (recommended for local in application-local.yml), every {@link AppException} is logged with a full stack trace.
     */
    @Value("${listmynest.logging.stack-traces-for-all-errors:false}")
    private boolean stackTracesForAllErrors;

    public GlobalExceptionHandler(Environment environment) {
        this.environment = environment;
    }

    private boolean isProductionProfile() {
        return Arrays.asList(environment.getActiveProfiles()).contains("prod");
    }

    public record FieldErrorItem(String field, String message) {}

    public record ErrorBody(boolean success, String message, List<FieldErrorItem> fieldErrors) {}

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorBody> handleAppException(AppException ex, HttpServletRequest request) {
        if (!isProductionProfile()) {
            boolean withStack = stackTracesForAllErrors || ex.getStatus().is5xxServerError();
            if (withStack) {
                log.warn(
                        "APP_ERROR status={} path={} code={}",
                        ex.getStatus().value(),
                        request.getRequestURI(),
                        ex.getMessage(),
                        ex
                );
            } else {
                log.info(
                        "APP_ERROR status={} path={} code={}",
                        ex.getStatus().value(),
                        request.getRequestURI(),
                        ex.getMessage()
                );
            }
        }
        return ResponseEntity.status(ex.getStatus()).body(
                new ErrorBody(false, ex.getMessage(), null)
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        if (!isProductionProfile()) {
            log.warn("VALIDATION_ERROR path={}", request.getRequestURI(), ex);
        }
        List<FieldErrorItem> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldItem)
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                new ErrorBody(false, "Validation failed", errors)
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        if (!isProductionProfile()) {
            log.warn("ACCESS_DENIED path={}", request.getRequestURI(), ex);
        }
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                new ErrorBody(false, "FORBIDDEN", null)
        );
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorBody> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        if (!isProductionProfile()) {
            log.warn("PARAM_TYPE_MISMATCH path={}", request.getRequestURI(), ex);
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                new ErrorBody(false, "Invalid request parameter", null)
        );
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorBody> handleEntityNotFound(EntityNotFoundException ex, HttpServletRequest request) {
        String msg = ex.getMessage() == null ? "Not found" : ex.getMessage();
        if (!isProductionProfile()) {
            log.warn("ENTITY_NOT_FOUND path={} msg={}", request.getRequestURI(), msg, ex);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new ErrorBody(false, msg, null)
        );
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorBody> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        if (!isProductionProfile()) {
            log.warn("NO_RESOURCE path={} msg={}", request.getRequestURI(), ex.getMessage(), ex);
        } else {
            log.warn("{} {} — no handler or static resource (message: {})", request.getMethod(), request.getRequestURI(), ex.getMessage());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new ErrorBody(false, "Not found", null)
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex, HttpServletRequest request) {
        if (isProductionProfile()) {
            log.error("UNHANDLED {} {} — {}", request.getMethod(), request.getRequestURI(), ex.toString());
        } else {
            log.error(
                    "UNHANDLED {} {} — {}",
                    request.getMethod(),
                    request.getRequestURI(),
                    ex.toString(),
                    ex
            );
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                new ErrorBody(false, "INTERNAL_ERROR", null)
        );
    }

    private FieldErrorItem toFieldItem(FieldError err) {
        String msg = err.getDefaultMessage() == null ? "Invalid value" : err.getDefaultMessage();
        return new FieldErrorItem(err.getField(), msg);
    }
}
