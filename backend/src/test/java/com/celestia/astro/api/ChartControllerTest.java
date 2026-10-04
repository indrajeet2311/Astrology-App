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
  private static final String MATCH = "{\"bride\":" + VALID + ",\"groom\":" + VALID + "}";

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
        void acceptsTransitDateForBirthLocationNoon() throws Exception {
          String withTransitDate = VALID.replace("\"ayanamsa\":\"LAHIRI\"", "\"ayanamsa\":\"LAHIRI\",\"transitDate\":\"2024-01-01\"");
          mvc.perform(post("/api/chart").contentType(MediaType.APPLICATION_JSON).content(withTransitDate))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.transits.asOf").value("2024-01-01T06:30:00Z"));
        }

          @Test
          void returnsAshtakootaScoresForBothCharts() throws Exception {
            mvc.perform(post("/api/chart/match").contentType(MediaType.APPLICATION_JSON).content(MATCH))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.kootas.length()").value(8))
            .andExpect(jsonPath("$.maxScore").value(36.0))
            .andExpect(jsonPath("$.score").isNumber());
          }

            @Test
            void returnsDailyPanchangForSelectedDateAndPlace() throws Exception {
              String daily = """
              {"date":"2024-01-01","placeName":"New Delhi, India","latitude":28.6139,
               "longitude":77.209,"timeZone":"Asia/Kolkata","ayanamsa":"LAHIRI"}""";
              mvc.perform(post("/api/panchang").contentType(MediaType.APPLICATION_JSON).content(daily))
              .andExpect(status().isOk())
              .andExpect(jsonPath("$.asOf").value("2024-01-01T06:30:00Z"))
              .andExpect(jsonPath("$.panchang.tithi").isNotEmpty())
              .andExpect(jsonPath("$.moon.nakshatra").isNotEmpty());
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
