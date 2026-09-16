import type { TrafficEventService } from "../traffic-events/traffic-event-service.js";

export class TrafficEventPoller {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly coverageAreaId: string,
    private readonly intervalMs: number,
    private readonly service: Pick<TrafficEventService, "syncCoverage">,
    private readonly onError: (error: unknown) => void = console.error,
  ) {}

  async runOnce() {
    if (this.running) return null;
    this.running = true;
    try {
      return await this.service.syncCoverage(this.coverageAreaId);
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
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
