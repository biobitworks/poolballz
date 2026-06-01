import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeVenues } from '../src/storage.js';
import { seedVenues } from '../src/venues.js';

const DATA_PATH = join(tmpdir(), 'poolballz-venues.json');
const EVENT_PATH = join(tmpdir(), 'poolballz-vote-events.json');
const BLOB_PATH = 'poolballz/venues.json';
const VOTE_EVENT_PREFIX = 'poolballz/vote-events/';

function streamToText(stream) {
  return new Response(stream).text();
}

export function hasBlobConfig(env = process.env) {
  return Boolean(env.BLOB_READ_WRITE_TOKEN);
}

export async function readBlobVenues(blobClient) {
  const { get } = blobClient;
  try {
    const result = await get(BLOB_PATH, { access: 'private' });
    if (!result?.stream) return normalizeVenues(seedVenues);
    return normalizeVenues(JSON.parse(await streamToText(result.stream)));
  } catch (error) {
    if (error?.name === 'BlobNotFoundError') return normalizeVenues(seedVenues);
    throw error;
  }
}

async function listAllBlobs(blobClient, prefix) {
  const { list } = blobClient;
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...(page.blobs || []));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

export async function readBlobVoteEvents(blobClient) {
  const { get } = blobClient;
  const blobs = await listAllBlobs(blobClient, VOTE_EVENT_PREFIX);
  const events = await Promise.all(
    blobs.map(async (blob) => {
      const result = await get(blob.pathname, { access: 'private', useCache: false });
      if (!result?.stream) return null;
      return JSON.parse(await streamToText(result.stream));
    }),
  );
  return events.filter(Boolean).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export async function writeBlobVenues(blobClient, venues) {
  const { put } = blobClient;
  const normalized = normalizeVenues(venues);
  await put(BLOB_PATH, JSON.stringify(normalized), {
    access: 'private',
    allowOverwrite: true,
    cacheControlMaxAge: 0,
    contentType: 'application/json',
  });
  return normalized;
}

export async function writeBlobVoteEvent(blobClient, event) {
  const { put } = blobClient;
  const safeId = String(event.id || `${Date.now()}-${Math.random()}`).replace(/[^a-zA-Z0-9_.-]/g, '-');
  await put(`${VOTE_EVENT_PREFIX}${safeId}.json`, JSON.stringify(event), {
    access: 'private',
    allowOverwrite: false,
    cacheControlMaxAge: 0,
    contentType: 'application/json',
  });
  return event;
}

export async function readFileVenues(path = DATA_PATH) {
  try {
    const raw = await readFile(path, 'utf8');
    return normalizeVenues(JSON.parse(raw));
  } catch {
    return normalizeVenues(seedVenues);
  }
}

export async function writeFileVenues(venues, path = DATA_PATH) {
  const normalized = normalizeVenues(venues);
  await writeFile(path, JSON.stringify(normalized), 'utf8');
  return normalized;
}

export async function readFileVoteEvents(path = EVENT_PATH) {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeFileVoteEvent(event, path = EVENT_PATH) {
  await mkdir(dirname(path), { recursive: true });
  const events = await readFileVoteEvents(path);
  const nextEvents = events.some((item) => item.id === event.id) ? events : [...events, event];
  await writeFile(path, JSON.stringify(nextEvents), 'utf8');
  return event;
}

export async function getVenueStore(env = process.env) {
  if (hasBlobConfig(env)) {
    const blobClient = await import('@vercel/blob');
    return {
      name: 'vercel-blob',
      read: () => readBlobVenues(blobClient),
      write: (venues) => writeBlobVenues(blobClient, venues),
      readVoteEvents: () => readBlobVoteEvents(blobClient),
      writeVoteEvent: (event) => writeBlobVoteEvent(blobClient, event),
    };
  }
  return {
    name: 'file-fallback',
    read: () => readFileVenues(),
    write: (venues) => writeFileVenues(venues),
    readVoteEvents: () => readFileVoteEvents(),
    writeVoteEvent: (event) => writeFileVoteEvent(event),
  };
}
