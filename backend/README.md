# Celestia backend

## Swiss Ephemeris Java dependency

Celestia uses Thomas Mack's Java port of Swiss Ephemeris 2.01, republished on JitPack as `com.github.krishnact:swisseph` and pinned in `pom.xml` to the build `master-6000e46cf8-1`. Only `SwissEphemerisCalculator` touches its API (package `de.thmac.swisseph`).

The adapter uses:
- sidereal mode: Lahiri, Raman or Krishnamurti
- `swe_calc_ut` for UT-based planetary calculations
- Moshier flag explicitly (`SEFLG_MOSEPH`)
- speed output to determine retrograde status
- mean node for Rahu
- Ketu = normalized(Rahu + 180°), with the same motion as Rahu

The API refuses to return a chart when the ephemeris calculation fails.
