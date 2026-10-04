package com.celestia.astro.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ChartControllerTest {
  @Autowired
  MockMvc mvc;

  private static final String VALID = """
      {"name":"Test","date":"1990-08-15","time":"06:30","placeName":"New Delhi, India",
       "latitude":28.6139,"longitude":77.209,"timeZone":"Asia/Kolkata","ayanamsa":"LAHIRI"}""";

  @Test
  void returnsChart() throws Exception {
    mvc.perform(post("/api/chart").contentType(MediaType.APPLICATION_JSON).content(VALID))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.planets.length()").value(9))
        .andExpect(jsonPath("$.planets[0].divisionalSigns.D1").isNumber())
        .andExpect(jsonPath("$.planets[0].divisionalSigns.D2").isNumber())
        .andExpect(jsonPath("$.planets[0].divisionalSigns.D60").isNumber())
        .andExpect(jsonPath("$.planets[0].divisionalSigns.D9").isNumber())
        .andExpect(jsonPath("$.dashas.length()").value(9))
        .andExpect(jsonPath("$.aspects.length()").value(9))
        .andExpect(jsonPath("$.yogas").isArray())
        .andExpect(jsonPath("$.transits.planets.length()").value(9))
        .andExpect(jsonPath("$.transits.sadeSati.active").isBoolean())
        .andExpect(jsonPath("$.panchang.vara").value("Wednesday"))
        .andExpect(jsonPath("$.panchang.tithiNumber").isNumber())
        .andExpect(jsonPath("$.planets[0].combust").value(false))
        .andExpect(jsonPath("$.dashas[0].antardashas.length()").value(9))
        .andExpect(jsonPath("$.ascendant.house").value(1));
  }

  @Test
  void reportsMissingFieldsAsErrorMessage() throws Exception {
    mvc.perform(post("/api/chart").contentType(MediaType.APPLICATION_JSON).content("{}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").isNotEmpty());
  }

  @Test
  void rejectsUnknownTimeZone() throws Exception {
    mvc.perform(post("/api/chart").contentType(MediaType.APPLICATION_JSON)
            .content(VALID.replace("Asia/Kolkata", "Mars/Olympus")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").isNotEmpty());
  }

  @Test
  void rejectsMalformedDate() throws Exception {
    mvc.perform(post("/api/chart").contentType(MediaType.APPLICATION_JSON)
            .content(VALID.replace("1990-08-15", "15/08/1990")))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.error").isNotEmpty());
  }
}
