import { describe, expect, it } from "vitest";

import {
  partitionStatisticsReport,
  parseSpeedStatistics,
  parseVolumeStatistics,
} from "./parse-statistics-report.js";

describe("Fintraffic statistics report parser", () => {
  it("expands a real-shaped hourly volume row into UTC buckets", () => {
    const csv =
      "\uFEFFpistetunnus;sijainti;pvm;suunta;suuntaselite;kaista;jaottelu;ajoneuvoluokka;00_01;01_02;yhteensa\n" +
      "20002;vt1_Espoo_Hirvisuo;20250901;1;Turku;*;Kaikki;kaikki;138;102;240\n";

    expect(parseVolumeStatistics(csv, "hour")).toEqual([
      {
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2025-08-31T21:00:00.000Z"),
        vehicleCount: 138,
      },
      {
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2025-08-31T22:00:00.000Z"),
        vehicleCount: 102,
      },
    ]);
  });

  it("keeps daily speed detection count separate from corrected volume", () => {
    const csv =
      "\uFEFFpistetunnus;sijainti;pvm;suunta;suuntaselite;nopeusrajoitus;Kaikki;keskinopeus_Kaikki\n" +
      "20002;vt1_Espoo_Hirvisuo;20250901;1;Turku;100/100;23419;94.3\n";

    expect(parseSpeedStatistics(csv, "day")).toEqual([
      {
        direction: 1,
        resolution: "day",
        bucketStart: new Date("2025-08-31T21:00:00.000Z"),
        detectedVehicleCount: 23_419,
        averageSpeedKmh: 94.3,
      },
    ]);
  });

  it("does not turn a nonexistent Helsinki spring hour into a duplicate UTC bucket", () => {
    const volumeCsv =
      "pistetunnus;pvm;suunta;ajoneuvoluokka;00_01;03_04;04_05\n" +
      "12;20260329;1;kaikki;;64;143\n";
    const speedCsv =
      "pistetunnus;pvm;suunta;klo;Kaikki;keskinopeus_Kaikki\n" +
      "12;20260329;1;3;64;89.2\n" +
      "12;20260329;1;4;143;90.1\n";

    expect(parseVolumeStatistics(volumeCsv, "hour")).toEqual([
      {
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2026-03-29T01:00:00.000Z"),
        vehicleCount: 143,
      },
    ]);
    expect(parseSpeedStatistics(speedCsv, "hour")).toEqual([
      {
        direction: 1,
        resolution: "hour",
        bucketStart: new Date("2026-03-29T01:00:00.000Z"),
        detectedVehicleCount: 143,
        averageSpeedKmh: 90.1,
      },
    ]);
  });

  it("rejects an unexpected response instead of marking it as empty data", () => {
    expect(() => parseVolumeStatistics("<html>error</html>", "day")).toThrow(
      "unexpected format",
    );
    expect(() => parseSpeedStatistics("pvm;suunta\n", "hour")).toThrow(
      "unexpected format",
    );
  });

  it("keeps grouped stations isolated before parsing measurements", () => {
    const grouped = partitionStatisticsReport(
      "\uFEFFpistetunnus;pvm;suunta;Kaikki\n" +
        "3;20250901;1;100\n" +
        "4;20250901;1;200\n",
      [3, 4, 5],
    );
    expect(parseVolumeStatistics(grouped.get(3)!, "day")[0]?.vehicleCount).toBe(
      100,
    );
    expect(parseVolumeStatistics(grouped.get(4)!, "day")[0]?.vehicleCount).toBe(
      200,
    );
    expect(parseVolumeStatistics(grouped.get(5)!, "day")).toEqual([]);
    expect(() =>
      partitionStatisticsReport("pistetunnus;pvm\n9;20250901\n", [3]),
    ).toThrow("unexpected station");
  });
});
