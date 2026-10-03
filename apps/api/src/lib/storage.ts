import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '../config/env.js';

/**
 * Stockage des fichiers envoyés par les utilisateurs (photos de profil aujourd'hui).
 * - `local` : disque du serveur, servi par l'API sous /uploads (dev et VPS avec volume Docker) ;
 * - `s3`    : stockage objet compatible S3 (Datacloud), servi par son URL publique ou un CDN.
 */
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  /** Supprime le fichier correspondant à une URL publique, s'il vient de ce stockage. */
  deleteByUrl(url: string): Promise<void>;
  /** Dossier à servir en statique (driver local uniquement). */
  localDir?: string;
}

function createLocalStorage(dir: string, publicUrl: string): Storage {
  const base = publicUrl.replace(/\/$/, '');
  return {
    localDir: dir,
    async put(key, body) {
      const file = path.join(dir, key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
      return `${base}/${key}`;
    },
    async deleteByUrl(url) {
      if (!url.startsWith(`${base}/`)) return;
      const key = url.slice(base.length + 1);
      // Les clés sont générées par l'API : on refuse tout chemin qui sortirait du dossier.
      if (key.includes('..')) return;
      await rm(path.join(dir, key), { force: true });
    },
  };
}

async function createS3Storage(env: Env): Promise<Storage> {
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  if (!env.S3_BUCKET || !env.S3_PUBLIC_URL)
    throw new Error('S3_BUCKET et S3_PUBLIC_URL sont requis');
  const client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY }
        : undefined,
  });
  const base = env.S3_PUBLIC_URL.replace(/\/$/, '');
  const bucket = env.S3_BUCKET;
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return `${base}/${key}`;
    },
    async deleteByUrl(url) {
      if (!url.startsWith(`${base}/`)) return;
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: url.slice(base.length + 1) }),
      );
    },
  };
}

export async function createStorage(env: Env): Promise<Storage> {
  return env.STORAGE_DRIVER === 's3'
    ? createS3Storage(env)
    : createLocalStorage(path.resolve(env.UPLOADS_DIR), env.PUBLIC_UPLOADS_URL);
}

/** Formats d'image acceptés, reconnus par leurs premiers octets (jamais par l'extension). */
export function detectImage(body: Buffer): { ext: 'webp' | 'jpg' | 'png'; mime: string } | null {
  if (body.length < 12) return null;
  if (
    body.subarray(0, 4).toString('ascii') === 'RIFF' &&
    body.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }
  if (body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff)
    return { ext: 'jpg', mime: 'image/jpeg' };
  if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: 'png', mime: 'image/png' };
  }
  return null;
}
