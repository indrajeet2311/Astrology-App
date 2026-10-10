package com.celestia.astro.api;

import com.celestia.astro.service.PlaceLookupException;
import com.celestia.astro.service.ConsultationDeliveryException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.DateTimeException;
import java.util.Map;
import java.util.stream.Collectors;

/** Every error response has the shape {"error": "..."} so the UI can show it directly. */
@RestControllerAdvice
public class ApiExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, String>> invalid(MethodArgumentNotValidException e) {
    String message = e.getBindingResult().getFieldErrors().stream()
        .map(f -> f.getField() + " " + f.getDefaultMessage())
        .sorted()
        .collect(Collectors.joining("; "));
    return error(HttpStatus.BAD_REQUEST, message.isEmpty() ? "Invalid request." : message);
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<Map<String, String>> unreadable(HttpMessageNotReadableException e) {
    return error(HttpStatus.BAD_REQUEST, "Malformed request. Check the date, time and ayanamsa values.");
  }

  @ExceptionHandler(MissingServletRequestParameterException.class)
  ResponseEntity<Map<String, String>> missingParam(MissingServletRequestParameterException e) {
    return error(HttpStatus.BAD_REQUEST, "Missing parameter: " + e.getParameterName());
  }

  @ExceptionHandler(DateTimeException.class)
  ResponseEntity<Map<String, String>> badTimeZone(DateTimeException e) {
    return error(HttpStatus.BAD_REQUEST, "Invalid date, time or timezone: " + e.getMessage());
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<Map<String, String>> badArgument(IllegalArgumentException e) {
    return error(HttpStatus.BAD_REQUEST, e.getMessage());
  }

  @ExceptionHandler(PlaceLookupException.class)
  ResponseEntity<Map<String, String>> placeLookup(PlaceLookupException e) {
    log.warn("Place lookup failed", e);
    return error(HttpStatus.BAD_GATEWAY, e.getMessage());
  }

  @ExceptionHandler(ConsultationDeliveryException.class)
  ResponseEntity<Map<String, String>> consultationDelivery(ConsultationDeliveryException e) {
    log.error("Consultation email delivery failed", e);
    return error(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
  }

  @ExceptionHandler(RuntimeException.class)
  ResponseEntity<Map<String, String>> unexpected(RuntimeException e) {
    log.error("Unexpected error", e);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "The chart could not be calculated. Please try again.");
  }

  private static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
    return ResponseEntity.status(status).body(Map.of("error", message));
  }
}
