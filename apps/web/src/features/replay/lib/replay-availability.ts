import {
  REPLAY_MAXIMUM_RANGE_DAYS,
  type HistoryResponse,
  type ReplayResolution,
} from "@traffic-twin/contracts";

export type ReplayAvailabilityReason =
  | "AVAILABLE"
  | "FINE_RESOLUTION_REQUIRED"
  | "RANGE_TOO_LONG"
  | "NOT_ENOUGH_FRAMES";

export interface ReplayAvailability {
  available: boolean;
  resolution: ReplayResolution | null;
  frameCount: number;
  reason: ReplayAvailabilityReason;
  message: string;
}

const replayableResolutions: ReadonlySet<string> = new Set(["minute", "hour"]);

const unitLabel: Record<ReplayResolution, string> = {
  minute: "dakika",
  hour: "saat",
};

export function getReplayAvailability(
  history: HistoryResponse,
): ReplayAvailability {
  const frameCount = new Set(
    history.series.flatMap((series) =>
      series.points.map((point) => point.timestamp),
    ),
  ).size;

  if (!replayableResolutions.has(history.resolution)) {
    return {
      available: false,
      resolution: null,
      frameCount,
      reason: "FINE_RESOLUTION_REQUIRED",
      message:
        "Haritada akışı oynatmak için dakika veya saat ölçümleri gerekir. Çözünürlüğü “Dakika” ya da “Saat” seçin; ayrıntılı veri yoksa ilgili günü içeri alın veya daha geniş bir aralık seçin.",
    };
  }

  const resolution = history.resolution as ReplayResolution;
  const unit = unitLabel[resolution];

  const maximumRangeDays = REPLAY_MAXIMUM_RANGE_DAYS[resolution];
  const rangeMs =
    new Date(history.query.to).getTime() -
    new Date(history.query.from).getTime();
  if (rangeMs > maximumRangeDays * 86_400_000) {
    return {
      available: false,
      resolution,
      frameCount,
      reason: "RANGE_TOO_LONG",
      message: `Replay bu çözünürlükte en fazla ${maximumRangeDays} günlük bir aralıkta çalışır.`,
    };
  }

  if (frameCount < 2) {
    return {
      available: false,
      resolution,
      frameCount,
      reason: "NOT_ENOUGH_FRAMES",
      message: `Replay için en az iki gerçek ${unit} ölçümü gerekir.`,
    };
  }

  return {
    available: true,
    resolution,
    frameCount,
    reason: "AVAILABLE",
    message: `${frameCount.toLocaleString("tr-TR")} gerçek ${unit} karesi oynatılabilir.`,
  };
}
