package com.listmynest.exception;

import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    public record FieldErrorItem(String field, String message) {}

    public record ErrorBody(boolean success, String message, List<FieldErrorItem> fieldErrors) {}

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ErrorBody> handleAppException(AppException ex) {
        return ResponseEntity.status(ex.getStatus()).body(
                new ErrorBody(false, ex.getMessage(), null)
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException ex) {
        List<FieldErrorItem> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldItem)
                .toList();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                new ErrorBody(false, "Validation failed", errors)
        );
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorBody> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                new ErrorBody(false, "Access denied", null)
        );
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorBody> handleEntityNotFound(EntityNotFoundException ex, HttpServletRequest request) {
        String msg = ex.getMessage() == null ? "Not found" : ex.getMessage();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new ErrorBody(false, msg, null)
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorBody> handleGeneric(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error on {}: {}", request.getRequestURI(), ex.toString(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                new ErrorBody(false, "Internal server error", null)
        );
    }

    private FieldErrorItem toFieldItem(FieldError err) {
        String msg = err.getDefaultMessage() == null ? "Invalid value" : err.getDefaultMessage();
        return new FieldErrorItem(err.getField(), msg);
    }
}
