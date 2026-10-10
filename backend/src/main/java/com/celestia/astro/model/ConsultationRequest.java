package com.celestia.astro.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConsultationRequest(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email @Size(max = 254) String email,
    @Size(max = 40) String phone,
    @NotBlank @Pattern(regexp = "email|phone") String contactMethod,
    @NotBlank @Pattern(regexp = "Marriage and relationships|Career and work|Family and home|Education|Spiritual growth|General chart reading|Other") String topic,
    @NotBlank @Size(max = 2000) String question,
    @Size(max = 300) String availability,
    @NotBlank @Size(max = 80) String timezone,
    boolean shareBirthDetails,
    @Size(max = 0) String website,
    @Size(max = 10) String birthDate,
    @Size(max = 5) String birthTime,
    @Size(max = 200) String birthPlace) {}