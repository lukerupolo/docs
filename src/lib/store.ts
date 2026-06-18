// Low-level document store: read/write JSON blobs by key.
// Two backends:
//   - S3Store: used when S3_BUCKET is set (production / shared).
//   - LocalStore: JSON files under DATA_DIR (default .data) for local dev.
// The rest of the app only talks to the `getStore()` interface, so swapping
// backends never touches business logic.

import { promises as fs } from "fs";
import path from "path";

export interface DocStore {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  backend: "s3" | "local";
}

class LocalStore implements DocStore {
  backend = "local" as const;
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private file(key: string) {
    // keys look like "lessons/index.json" — keep the dir structure on disk.
    return path.join(this.dir, key);
  }

  async read<T>(key: string): Promise<T | null> {
    try {
      const raw = await fs.readFile(this.file(key), "utf8");
      return JSON.parse(raw) as T;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    const file = this.file(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
  }
}

class S3Store implements DocStore {
  backend = "s3" as const;
  private bucket: string;
  private prefix: string;
  // Lazily-imported client so the AWS SDK isn't loaded in local-only setups.
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client> | null =
    null;

  constructor(bucket: string, prefix: string, private region: string) {
    this.bucket = bucket;
    this.prefix = prefix.replace(/\/$/, "");
  }

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = import("@aws-sdk/client-s3").then(
        ({ S3Client }) => new S3Client({ region: this.region })
      );
    }
    return this.clientPromise;
  }

  private objectKey(key: string) {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  async read<T>(key: string): Promise<T | null> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) })
      );
      const body = await res.Body?.transformToString();
      return body ? (JSON.parse(body) as T) : null;
    } catch (err: unknown) {
      const name = (err as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw err;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.objectKey(key),
        Body: JSON.stringify(value, null, 2),
        ContentType: "application/json",
      })
    );
  }
}

let cached: DocStore | null = null;

export function getStore(): DocStore {
  if (cached) return cached;
  const bucket = process.env.S3_BUCKET?.trim();
  if (bucket) {
    cached = new S3Store(
      bucket,
      process.env.S3_PREFIX ?? "lingo",
      process.env.AWS_REGION ?? "us-east-1"
    );
  } else {
    cached = new LocalStore(process.env.DATA_DIR ?? ".data");
  }
  return cached;
}
