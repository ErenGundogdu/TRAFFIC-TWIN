import type { TrafficBatch } from "@traffic-twin/contracts";

import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";
import type {
  FintrafficClient,
  HttpValidators,
} from "../providers/fintraffic/client.js";
import { normalizeStations } from "../providers/fintraffic/normalize-stations.js";
import type {
  FintrafficStationCollection,
  FintrafficStationSensorConstantsCollection,
} from "../providers/fintraffic/schemas.js";
import type { TrafficObservationRepository } from "../telemetry/traffic-observation-repository.js";

const METADATA_TTL_MS = 24 * 60 * 60 * 1_000;
const SENSOR_CONSTANTS_RETRY_MS = 15 * 60 * 1_000;

interface PollResult {
  status: "updated" | "not-modified";
  insertedObservationCount: number;
}

export class LiveTrafficPoller {
  private validators: HttpValidators = {};
  private metadata: FintrafficStationCollection | null = null;
  private sensorConstants: FintrafficStationSensorConstantsCollection | null =
    null;
  private sensorConstantsRefresh: Promise<void> | null = null;
  private sensorConstantsFetchedAt = 0;
  private sensorConstantsAttemptedAt = 0;
  private metadataFetchedAt = 0;
  private lastSourceUpdatedAt: string | undefined;
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly coverageAreaId: string,
    private readonly intervalMs: number,
    private readonly stationRepository: StationCatalogRepository,
    private readonly observationRepository: TrafficObservationRepository,
    private readonly client: Pick<
      FintrafficClient,
      "getStations" | "getSensorConstants" | "getCurrentStationDataConditional"
    >,
    private readonly publish: (batch: TrafficBatch) => void,
    private readonly clock: () => Date = () => new Date(),
    private readonly onError: (error: unknown) => void = console.error,
    private readonly afterPersist?: () => Promise<void>,
  ) {}

  async runOnce(): Promise<PollResult> {
    if (this.running) {
      return { status: "not-modified", insertedObservationCount: 0 };
    }

    this.running = true;

    try {
      const now = this.clock();
      const coverageArea = await this.stationRepository.findCoverageArea(
        this.coverageAreaId,
      );

      if (!coverageArea) {
        throw new Error(
          `Coverage area '${this.coverageAreaId}' was not found.`,
        );
      }

      if (
        !this.metadata ||
        now.getTime() - this.metadataFetchedAt >= METADATA_TTL_MS
      ) {
        this.metadata = await this.client.getStations();
        this.metadataFetchedAt = now.getTime();
      }

      if (
        !this.sensorConstantsRefresh &&
        (this.sensorConstants
          ? now.getTime() - this.sensorConstantsFetchedAt >= METADATA_TTL_MS
          : now.getTime() - this.sensorConstantsAttemptedAt >=
            SENSOR_CONSTANTS_RETRY_MS)
      ) {
        this.sensorConstantsAttemptedAt = now.getTime();
        this.sensorConstantsRefresh = this.client
          .getSensorConstants()
          .then((sensorConstants) => {
            this.sensorConstants = sensorConstants;
            this.sensorConstantsFetchedAt = this.clock().getTime();
          })
          .catch(this.onError)
          .finally(() => {
            this.sensorConstantsRefresh = null;
          });
      }

      const result = await this.client.getCurrentStationDataConditional(
        this.validators,
      );
      this.validators = result.validators;

      if (result.status === "not-modified") {
        return { status: "not-modified", insertedObservationCount: 0 };
      }

      if (result.data.dataUpdatedTime === this.lastSourceUpdatedAt) {
        return { status: "not-modified", insertedObservationCount: 0 };
      }

      const stations = normalizeStations(
        this.metadata,
        result.data,
        coverageArea,
        now,
        this.sensorConstants,
      );
      const sourceUpdatedAt = new Date(result.data.dataUpdatedTime);

      await this.stationRepository.upsertStations(
        coverageArea.id,
        stations,
        new Date(this.metadata.dataUpdatedTime),
        this.sensorConstants
          ? new Date(this.sensorConstants.dataUpdatedTime)
          : undefined,
      );
      const insertedObservationCount =
        await this.observationRepository.insertBatch(stations, sourceUpdatedAt);
      this.lastSourceUpdatedAt = result.data.dataUpdatedTime;

      this.publish({
        coverageAreaId: coverageArea.id,
        sourceUpdatedAt: sourceUpdatedAt.toISOString(),
        emittedAt: now.toISOString(),
        stations,
      });

      if (insertedObservationCount > 0 && this.afterPersist) {
        try {
          await this.afterPersist();
        } catch (error) {
          this.onError(error);
        }
      }

      return { status: "updated", insertedObservationCount };
    } finally {
      this.running = false;
    }
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.runOnce().catch(this.onError);
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
