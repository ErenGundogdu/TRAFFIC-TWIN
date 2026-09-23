import { FintrafficResponseError } from "./client.js";
import type { StatisticsResolution } from "./parse-statistics-report.js";

export type StatisticsMetric = "volume" | "speed";

export interface StatisticsReportQuery {
  tmsNumber: number;
  direction: 1 | 2;
  metric: StatisticsMetric;
  resolution: StatisticsResolution;
  from: string;
  to: string;
}

export interface StatisticsBulkReportQuery extends Omit<
  StatisticsReportQuery,
  "tmsNumber"
> {
  tmsNumbers: number[];
}

export class FintrafficStatisticsRangeError extends FintrafficResponseError {
  constructor() {
    super("Fintraffic statistics range failed in source calculation.", 400);
  }
}

export interface StatisticsRequestPolicy {
  minimumIntervalMs: number;
  retryDelayMs: number;
  maximumAttempts: number;
}

const defaultRequestPolicy: StatisticsRequestPolicy = {
  minimumIntervalMs: 500,
  retryDelayMs: 1_000,
  maximumAttempts: 3,
};

export class FintrafficStatisticsClient {
  private nextRequestAt = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly fetchImplementation: typeof fetch = fetch,
    private readonly requestPolicy: StatisticsRequestPolicy = defaultRequestPolicy,
  ) {}

  async getReport(query: StatisticsReportQuery): Promise<string> {
    return this.getBulkReport({
      ...query,
      tmsNumbers: [query.tmsNumber],
    });
  }

  async getBulkReport(query: StatisticsBulkReportQuery): Promise<string> {
    if (query.tmsNumbers.length === 0) {
      throw new Error("At least one TMS number is required.");
    }
    const url = new URL("history", `${this.baseUrl.replace(/\/$/, "")}/`);
    url.searchParams.set(
      "api",
      query.metric === "volume" ? "liikennemaara" : "keskinopeus",
    );
    url.searchParams.set("tyyppi", query.resolution === "hour" ? "h" : "vrk");
    url.searchParams.set("pvm", query.from);
    url.searchParams.set("loppu", query.to);
    url.searchParams.set("piste", query.tmsNumbers.join(","));
    url.searchParams.set("suunta", String(query.direction));
    url.searchParams.set("sisallytakaistat", "0");
    if (query.resolution === "hour") {
      url.searchParams.set("luokka", "kaikki");
    } else {
      url.searchParams.set("ryhma", "(*):Kaikki");
    }

    for (
      let attempt = 1;
      attempt <= this.requestPolicy.maximumAttempts;
      attempt++
    ) {
      await this.waitForRequestSlot();
      let response: Response;
      try {
        response = await this.fetchImplementation(url, {
          headers: {
            Accept: "text/csv",
            "Accept-Encoding": "gzip",
            "Digitraffic-User": this.userAgent,
          },
          signal: AbortSignal.timeout(60_000),
        });
      } catch (error) {
        if (attempt === this.requestPolicy.maximumAttempts) {
          throw new FintrafficResponseError(
            "Fintraffic statistics request failed after retries.",
            undefined,
            { cause: error },
          );
        }
        await delay(this.retryDelay(attempt));
        continue;
      }
      if (response.ok) return response.text();
      if (response.status === 400) {
        const body = await response.text();
        if (/division by zero/i.test(body)) {
          throw new FintrafficStatisticsRangeError();
        }
      }
      if (
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === this.requestPolicy.maximumAttempts
      ) {
        throw new FintrafficResponseError(
          `Fintraffic statistics request failed with status ${response.status}.`,
          response.status,
        );
      }
      const retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
      await delay(Math.max(this.retryDelay(attempt), retryAfterMs));
    }
    throw new Error("Statistics retry loop exhausted unexpectedly.");
  }

  private async waitForRequestSlot() {
    const now = Date.now();
    const scheduledAt = Math.max(now, this.nextRequestAt);
    this.nextRequestAt = scheduledAt + this.requestPolicy.minimumIntervalMs;
    await delay(scheduledAt - now);
  }

  private retryDelay(attempt: number) {
    return Math.min(
      this.requestPolicy.retryDelayMs * 2 ** (attempt - 1),
      30_000,
    );
  }
}

function delay(milliseconds: number) {
  return milliseconds > 0
    ? new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

function parseRetryAfter(header: string | null) {
  if (!header) return 0;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1_000, 30_000);
  }
  const date = Date.parse(header);
  return Number.isNaN(date)
    ? 0
    : Math.min(Math.max(date - Date.now(), 0), 30_000);
}
