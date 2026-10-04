package com.celestia.astro.service;

/** Raised when the geocoding provider is unreachable or returns unusable data. */
public class PlaceLookupException extends RuntimeException {
  public PlaceLookupException(String message, Throwable cause) {
    super(message, cause);
  }

  public PlaceLookupException(String message) {
    super(message);
  }
}
