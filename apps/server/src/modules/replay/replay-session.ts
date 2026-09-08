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

  seek(timestamp: string) {
    if (this.frames.length === 0) return;

    const target = new Date(timestamp).getTime();
    const nearestIndex = this.frames.reduce((nearest, frame, index) => {
      const nearestDistance = Math.abs(
        new Date(this.frames[nearest]!.timestamp).getTime() - target,
      );
      const frameDistance = Math.abs(
        new Date(frame.timestamp).getTime() - target,
      );
      return frameDistance < nearestDistance ? index : nearest;
    }, 0);
    const wasPaused = this.paused;

    this.clearTimer();
    this.emitFrame(this.frames[nearestIndex]!);
    this.index = nearestIndex + 1;
    if (!wasPaused) this.scheduleNext();
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
