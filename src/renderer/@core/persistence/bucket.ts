import type { Bucket } from '../domain/bucket';

export const bucketRepo = {
  list: (): Promise<Bucket[]> => window.FirstBucket.bucket.list(),
  upsert: (b: Bucket): Promise<boolean> => window.FirstBucket.bucket.upsert(b),
};
