package com.celestia.astro.service;

import com.celestia.astro.model.FestivalCalendarResponse;
import com.celestia.astro.model.FestivalCalendarResponse.Event;
import com.celestia.astro.model.FestivalCalendarResponse.LunarMonth;
import de.thmac.swisseph.SweConst;
import de.thmac.swisseph.SwissEph;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Hindu festival and Ekadashi calendar. Lunar months are amanta (new moon to new moon) and are named from the
 * Sun's sidereal sign at the new moon; a month in which the Sun does not change sign is Adhika.
 */
@Service
public class FestivalCalendarService {
  private static final String[] MONTHS = {
      "Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvina", "Kartika",
      "Margashirsha", "Pausha", "Magha", "Phalguna"};
  private static final String[] SANKRANTI = {
      "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrischika", "Dhanu", "Makara",
      "Kumbha", "Meena"};
  // Ekadashi names by (purnimanta) month; Shukla is the same in amanta and purnimanta reckoning.
  private static final String[] EKADASHI_SHUKLA = {
      "Kamada", "Mohini", "Nirjala", "Devshayani", "Shravana Putrada", "Parivartini", "Papankusha", "Devutthana",
      "Mokshada", "Pausha Putrada", "Jaya", "Amalaki"};
  private static final String[] EKADASHI_KRISHNA = {
      "Papamochani", "Varuthini", "Apara", "Yogini", "Kamika", "Aja", "Indira", "Rama", "Utpanna", "Saphala",
      "Shattila", "Vijaya"};

  private enum Sample { SUNRISE, MIDDAY, SUNSET, NIGHT, MIDNIGHT }

  private record Rule(String name, int month, int tithi, Sample sample) {}

  private static final List<Rule> RULES = List.of(
      new Rule("Ugadi / Gudi Padwa (Chaitra Navratri begins)", 0, 1, Sample.SUNRISE),
      new Rule("Ram Navami", 0, 9, Sample.MIDDAY),
      new Rule("Hanuman Jayanti", 0, 15, Sample.SUNRISE),
      new Rule("Akshaya Tritiya", 1, 3, Sample.MIDDAY),
      new Rule("Buddha Purnima", 1, 15, Sample.SUNSET),
      new Rule("Rath Yatra", 3, 2, Sample.SUNRISE),
      new Rule("Guru Purnima", 3, 15, Sample.SUNRISE),
      new Rule("Nag Panchami", 4, 5, Sample.MIDDAY),
      new Rule("Raksha Bandhan", 4, 15, Sample.MIDDAY),
      new Rule("Krishna Janmashtami", 4, 23, Sample.MIDNIGHT),
      new Rule("Ganesh Chaturthi", 5, 4, Sample.MIDDAY),
      new Rule("Sarva Pitru Amavasya (Mahalaya)", 5, 30, Sample.MIDDAY),
      new Rule("Sharad Navratri begins", 6, 1, Sample.SUNRISE),
      new Rule("Durga Ashtami", 6, 8, Sample.MIDDAY),
      new Rule("Vijayadashami (Dussehra)", 6, 10, Sample.MIDDAY),
      new Rule("Karwa Chauth", 6, 19, Sample.SUNSET),
      new Rule("Dhanteras", 6, 28, Sample.SUNSET),
      new Rule("Diwali (Lakshmi Puja)", 6, 30, Sample.SUNSET),
      new Rule("Govardhan Puja", 7, 1, Sample.SUNRISE),
      new Rule("Bhai Dooj", 7, 2, Sample.MIDDAY),
      new Rule("Kartik Purnima (Dev Deepawali)", 7, 15, Sample.SUNSET),
      new Rule("Vasant Panchami", 10, 5, Sample.MIDDAY),
      new Rule("Maha Shivaratri", 10, 29, Sample.MIDNIGHT),
      new Rule("Holi (Holika Dahan)", 11, 15, Sample.SUNSET));

  public FestivalCalendarResponse calendar(FestivalCalendarResponse.Request request) {
    int year = request.year();
    ZoneId zone = ZoneId.of(request.timeZone());
    double lat = request.latitude();
    double lon = request.longitude();
    LocalDate first = LocalDate.of(year, 1, 1);
    LocalDate last = LocalDate.of(year, 12, 31);

    SwissEph swe = new SwissEph();
    try {
      swe.swe_set_sid_mode(SwissEphemerisCalculator.sidMode(request.ayanamsa()), 0, 0);
      List<Instant> newMoons = newMoons(swe, first.minusDays(45).atStartOfDay(zone).toInstant(),
          last.plusDays(45).atStartOfDay(zone).toInstant());
      int[] startSign = new int[newMoons.size()];
      for (int i = 0; i < startSign.length; i++) {
        startSign[i] = AstroMath.sign(Ephem.calc(swe, newMoons.get(i), SweConst.SE_SUN).longitude()) + 1;
      }

      List<LunarMonth> months = new ArrayList<>();
      for (int i = 0; i + 1 < newMoons.size(); i++) {
        LocalDate s = newMoons.get(i).atZone(zone).toLocalDate();
        LocalDate e = newMoons.get(i + 1).atZone(zone).toLocalDate();
        if (e.isBefore(first) || s.isAfter(last)) continue;
        months.add(new LunarMonth(MONTHS[startSign[i] % 12], startSign[i] == startSign[i + 1], s.toString(), e.toString()));
      }

      List<Event> events = new ArrayList<>();
      Set<String> done = new HashSet<>();
      boolean previousEkadashi = false;
      Instant previousSunrise = null;
      int previousSunSign = 0;
      for (LocalDate day = first.minusDays(1); !day.isAfter(last); day = day.plusDays(1)) {
        Instant sunrise = SunTimes.sunrise(day, lat, lon);
        Instant sunset = SunTimes.sunset(day, lat, lon);
        int sunSign = AstroMath.sign(Ephem.calc(swe, sunrise, SweConst.SE_SUN).longitude()) + 1;
        if (previousSunrise != null && sunSign != previousSunSign) {
          final int before = previousSunSign;
          Instant moment = Ephem.firstTrue(previousSunrise, sunrise, x ->
              AstroMath.sign(Ephem.calc(swe, x, SweConst.SE_SUN).longitude()) + 1 != before);
          LocalDate date = moment.atZone(zone).toLocalDate();
          int idx = sunSign - 1;
          if (!date.isBefore(first)) {
            events.add(new Event(date.toString(), "SANKRANTI", SANKRANTI[idx] + " Sankranti"
                + (idx == 9 ? " (Makar Sankranti)" : ""), "Sun enters " + AstroMath.signName(sunSign - 1) + "."));
          }
        }
        previousSunrise = sunrise;
        previousSunSign = sunSign;
        if (day.isBefore(first)) continue;

        Instant next = SunTimes.sunrise(day.plusDays(1), lat, lon);
        Instant midday = sunrise.plus(Duration.between(sunrise, sunset).dividedBy(2));
        Instant night = sunset.plus(Duration.ofHours(3));
        Instant midnight = sunset.plus(Duration.between(sunset, next).dividedBy(2));
        int[] tithis = {tithi(swe, sunrise), tithi(swe, midday), tithi(swe, sunset), tithi(swe, night),
            tithi(swe, midnight)};
        Instant[] samples = {sunrise, midday, sunset, night, midnight};

        // Ekadashi: the tithi at sunrise; a second consecutive day is the Vaishnava observance.
        int morning = tithis[0];
        boolean ekadashi = morning == 11 || morning == 26;
        if (ekadashi) {
          int month = monthIndex(newMoons, startSign, sunrise);
          boolean adhika = isAdhika(newMoons, startSign, sunrise);
          boolean shukla = morning == 11;
          String name = adhika ? (shukla ? "Kamala (Padmini)" : "Parama")
              : shukla ? EKADASHI_SHUKLA[month] : EKADASHI_KRISHNA[(month + 1) % 12];
          events.add(new Event(day.toString(), "EKADASHI", name + " Ekadashi",
              (shukla ? "Shukla" : "Krishna") + " paksha" + (adhika ? " of the Adhika month" : "")
                  + (previousEkadashi ? "; second day (Vaishnava observance)." : ".")));
        }
        previousEkadashi = ekadashi;

        if (tithis[2] == 15) events.add(new Event(day.toString(), "PURNIMA", "Purnima", "Full moon tithi at sunset."));
        if (tithis[1] == 30) events.add(new Event(day.toString(), "AMAVASYA", "Amavasya", "New moon tithi at midday."));
        if (tithis[2] == 13 || tithis[2] == 28) {
          events.add(new Event(day.toString(), "PRADOSH", "Pradosh Vrat", "Trayodashi at sunset (Pradosh kaal)."));
        }
        if (tithis[3] == 19) {
          events.add(new Event(day.toString(), "SANKASHTI", "Sankashti Chaturthi",
              "Krishna Chaturthi in the evening; moonrise timing varies by place."));
        }

        for (Rule rule : RULES) {
          Instant sample = samples[rule.sample().ordinal()];
          if (tithis[rule.sample().ordinal()] != rule.tithi()) continue;
          if (isAdhika(newMoons, startSign, sample) || monthIndex(newMoons, startSign, sample) != rule.month()) continue;
          String key = rule.name() + monthStart(newMoons, sample);
          if (!done.add(key)) continue;
          events.add(new Event(day.toString(), "FESTIVAL", rule.name(),
              MONTHS[rule.month()] + (rule.tithi() <= 15 ? " Shukla " : " Krishna ")
                  + tithiName(rule.tithi()) + "."));
        }
      }
      events.sort(Comparator.comparing(Event::date).thenComparing(Event::category));
      return new FestivalCalendarResponse(year, request.placeName(), List.copyOf(months), List.copyOf(events));
    } finally {
      swe.swe_close();
    }
  }

  private static String tithiName(int tithi) {
    String[] names = {"Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami",
        "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi"};
    if (tithi == 15) return "Purnima";
    if (tithi == 30) return "Amavasya";
    return names[(tithi - 1) % 15];
  }

  private static int tithi(SwissEph swe, Instant at) {
    double elongation = AstroMath.norm(Ephem.calc(swe, at, SweConst.SE_MOON).longitude()
        - Ephem.calc(swe, at, SweConst.SE_SUN).longitude());
    return (int) (elongation / 12.0) + 1;
  }

  private static List<Instant> newMoons(SwissEph swe, Instant from, Instant to) {
    List<Instant> result = new ArrayList<>();
    Instant previous = from;
    double previousAngle = signedElongation(swe, from);
    for (Instant t = from.plus(Duration.ofHours(12)); !previous.isAfter(to); t = t.plus(Duration.ofHours(12))) {
      double angle = signedElongation(swe, t);
      if (previousAngle < 0 && angle >= 0 && Math.abs(angle - previousAngle) < 90) {
        result.add(Ephem.firstTrue(previous, t, x -> signedElongation(swe, x) >= 0));
      }
      previous = t;
      previousAngle = angle;
    }
    return result;
  }

  private static double signedElongation(SwissEph swe, Instant at) {
    return Ephem.signedAngle(Ephem.calc(swe, at, SweConst.SE_MOON).longitude(),
        Ephem.calc(swe, at, SweConst.SE_SUN).longitude());
  }

  private static int lunarIndex(List<Instant> newMoons, Instant at) {
    int i = 0;
    while (i + 2 < newMoons.size() && !at.isBefore(newMoons.get(i + 1))) i++;
    return i;
  }

  private static int monthIndex(List<Instant> newMoons, int[] startSign, Instant at) {
    return startSign[lunarIndex(newMoons, at)] % 12;
  }

  private static boolean isAdhika(List<Instant> newMoons, int[] startSign, Instant at) {
    int i = lunarIndex(newMoons, at);
    return startSign[i] == startSign[i + 1];
  }

  private static Instant monthStart(List<Instant> newMoons, Instant at) {
    return newMoons.get(lunarIndex(newMoons, at));
  }
}
