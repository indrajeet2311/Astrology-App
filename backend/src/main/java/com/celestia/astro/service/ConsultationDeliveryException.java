package com.celestia.astro.service;

public class ConsultationDeliveryException extends RuntimeException {
  public ConsultationDeliveryException(String message) {
    super(message);
  }

  public ConsultationDeliveryException(String message, Throwable cause) {
    super(message, cause);
  }
}