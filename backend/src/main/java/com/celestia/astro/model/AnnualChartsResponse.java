package com.celestia.astro.model;

public record AnnualChartsResponse(int year, String varshaphalAt, ChartResponse varshaphal,
                                   String tithiPraveshAt, ChartResponse tithiPravesh) {}