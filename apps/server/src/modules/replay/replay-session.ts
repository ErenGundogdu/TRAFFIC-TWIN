import type { ReplayFrame, ReplaySpeed } from "@traffic-twin/contracts";

export class ReplaySession {
  private index = 0;
  private timer: NodeJS.Timeout | undefined;
  private paused = false;

  constructor(
    private readonly frames: ReplayFrame[],
    private speed: ReplaySpeed,
    private readonly emitFrame: (frame: ReplayFrame) => void,
    private readonly emitEnded: () => void,
  ) {}

  start() {
    this.scheduleNext();
  }

  pause() {
    this.paused = true;
    this.clearTimer();
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    this.scheduleNext();
  }

  setSpeed(speed: ReplaySpeed) {
    this.speed = speed;
    if (!this.paused) {
      this.clearTimer();
      this.scheduleNext();
    }
  }

  stop() {
    this.paused = true;
    this.clearTimer();
  }

  private scheduleNext() {
    if (this.paused) return;
    const frame = this.frames[this.index];
    if (!frame) {
      this.emitEnded();
      this.stop();
      return;
    }

    this.timer = setTimeout(
      () => {
        this.emitFrame(frame);
        this.index += 1;
        this.scheduleNext();
      },
      Math.max(30, 1_000 / this.speed),
    );
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
