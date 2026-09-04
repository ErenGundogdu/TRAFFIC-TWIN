import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { dirname, join } from "node:path";

import { FintrafficResponseError } from "./client.js";

export interface DownloadedHistoryArtifact {
  sourceUrl: string;
  storagePath: string;
  checksumSha256: string;
  byteSize: number;
}

function ordinalDay(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const start = Date.UTC(year!, 0, 1);
  const current = Date.UTC(year!, month! - 1, day!);
  return Math.floor((current - start) / 86_400_000) + 1;
}

export class FintrafficHistoryClient {
  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async downloadDay(
    tmsNumber: number,
    sourceDate: string,
    archiveRoot: string,
  ): Promise<DownloadedHistoryArtifact> {
    const year = Number(sourceDate.slice(0, 4));
    const fileName = `lamraw_${tmsNumber}_${year % 100}_${ordinalDay(sourceDate)}.csv`;
    const sourceUrl = new URL(
      `history/raw/${fileName}`,
      `${this.baseUrl.replace(/\/$/, "")}/`,
    ).toString();
    const response = await this.fetchImplementation(sourceUrl, {
      headers: {
        Accept: "text/csv",
        "Accept-Encoding": "gzip",
        "Digitraffic-User": this.userAgent,
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok || !response.body) {
      throw new FintrafficResponseError(
        `Fintraffic history request failed with status ${response.status}.`,
        response.status,
      );
    }

    const storagePath = join(
      archiveRoot,
      "fintraffic-tms",
      String(tmsNumber),
      `${sourceDate}.csv.gz`,
    );
    const temporaryPath = `${storagePath}.partial`;
    await mkdir(dirname(storagePath), { recursive: true });

    const checksum = createHash("sha256");
    const checksumStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        checksum.update(chunk);
        callback(null, chunk);
      },
    });

    await pipeline(
      Readable.fromWeb(response.body),
      createGzip(),
      checksumStream,
      createWriteStream(temporaryPath),
    );
    await rename(temporaryPath, storagePath);
    const fileStat = await stat(storagePath);

    return {
      sourceUrl,
      storagePath,
      checksumSha256: checksum.digest("hex"),
      byteSize: fileStat.size,
    };
  }
}
