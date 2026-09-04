import { replayStartSchema, type ReplayStart } from "@traffic-twin/contracts";

import type { HistoryRepository } from "../analytics/history-repository.js";
import type { StationCatalogRepository } from "../asset-catalog/station-catalog-repository.js";

export class ReplayService {
  constructor(
    private readonly stationRepository: StationCatalogRepository,
    private readonly historyRepository: Pick<
      HistoryRepository,
      "getReplayFrames"
    >,
  ) {}

  async load(input: ReplayStart) {
    const command = replayStartSchema.parse(input);
    const knownAssets = new Set(
      (await this.stationRepository.listStations(command.coverageAreaId)).map(
        (station) => station.id,
      ),
    );
    if (command.assetIds.some((assetId) => !knownAssets.has(assetId))) {
      throw new Error("Replay asset is outside the coverage area.");
    }

    return this.historyRepository.getReplayFrames({
      assetIds: command.assetIds,
      direction: command.direction,
      from: new Date(command.from),
      to: new Date(command.to),
    });
  }
}
