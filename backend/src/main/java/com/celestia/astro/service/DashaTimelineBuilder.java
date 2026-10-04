package com.celestia.astro.service;

import com.celestia.astro.model.ChartResponse.Dasha;
import com.celestia.astro.model.ChartResponse.SubPeriod;

import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

final class DashaTimelineBuilder {
  private static final double SECONDS_PER_YEAR = 365.25 * 86_400.0;

  private DashaTimelineBuilder() {}

  static List<Dasha> build(String[] names, double[] yearsByIndex, int[] sequence, double elapsedFraction,
                           Instant birth, ZoneId zone) {
    return build(names, yearsByIndex, sequence, elapsedFraction, birth, zone, SECONDS_PER_YEAR);
  }

  static List<Dasha> build(String[] names, double[] yearsByIndex, int[] sequence, double elapsedFraction,
                           Instant birth, ZoneId zone, double secondsPerYear) {
    return build(names, yearsByIndex, sequence, elapsedFraction, birth, zone, secondsPerYear, false);
  }

  static List<Dasha> build(String[] names, double[] yearsByIndex, int[] sequence, double elapsedFraction,
                           Instant birth, ZoneId zone, double secondsPerYear, boolean equalAntardashas) {
    double firstLength = yearsByIndex[sequence[0]] * secondsPerYear;
    double cursor = birth.getEpochSecond() - elapsedFraction * firstLength;
    double cycleYears = 0;
    for (double year : yearsByIndex) cycleYears += year;

    List<Dasha> result = new ArrayList<>();
    for (int lord : sequence) {
      double length = yearsByIndex[lord] * secondsPerYear;
      double end = cursor + length;
      result.add(new Dasha(names[lord], date(cursor, zone), date(end, zone),
          subPeriods(names, yearsByIndex, sequence, lord, cursor, length, cycleYears, zone, equalAntardashas)));
      cursor = end;
    }
    return List.copyOf(result);
  }

  private static List<SubPeriod> subPeriods(String[] names, double[] years, int[] sequence, int startIndex,
                                            double start, double length, double totalYears, ZoneId zone,
                                            boolean equalPeriods) {
    int startAt = 0;
    while (sequence[startAt] != startIndex) startAt++;
    if (equalPeriods) startAt = (startAt + 1) % sequence.length;
    List<SubPeriod> result = new ArrayList<>();
    double cursor = start;
    for (int i = 0; i < sequence.length; i++) {
      int lord = sequence[(startAt + i) % sequence.length];
      double subLength = i == sequence.length - 1 ? start + length - cursor
          : equalPeriods ? length / sequence.length : length * years[lord] / totalYears;
      double end = cursor + subLength;
      List<SubPeriod> pratyantars = pratyantars(names, years, sequence, lord, cursor, subLength, totalYears, zone);
      result.add(new SubPeriod(names[lord], date(cursor, zone), date(end, zone), pratyantars));
      cursor = end;
    }
    return List.copyOf(result);
  }

  private static List<SubPeriod> pratyantars(String[] names, double[] years, int[] sequence, int startIndex,
                                             double start, double length, double totalYears, ZoneId zone) {
    int startAt = 0;
    while (sequence[startAt] != startIndex) startAt++;
    List<SubPeriod> result = new ArrayList<>();
    double cursor = start;
    for (int i = 0; i < sequence.length; i++) {
      int lord = sequence[(startAt + i) % sequence.length];
      double subLength = i == sequence.length - 1 ? start + length - cursor : length * years[lord] / totalYears;
      double end = cursor + subLength;
      result.add(new SubPeriod(names[lord], date(cursor, zone), date(end, zone), List.of()));
      cursor = end;
    }
    return List.copyOf(result);
  }

  private static String date(double epochSeconds, ZoneId zone) {
    return Instant.ofEpochSecond((long) Math.floor(epochSeconds)).atZone(zone).toLocalDate().toString();
  }
}