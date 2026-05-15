// Blob base URL for production content fetching.
// VITE_ prefix ensures Vite inlines it at build time.
// Undefined in dev → falls back to local ./content/ and ./data/.
const BLOB_BASE = import.meta.env.VITE_BLOB_BASE_URL as string | undefined;

export function manifestUrl(): string {
  // Cache-busting: topics.json changes when content is updated
  const bust = BLOB_BASE ? `?t=${Date.now()}` : '';
  return BLOB_BASE ? `${BLOB_BASE}/topics.json${bust}` : './data/topics.json';
}

export function contentUrl(topicPath: string, fileName: string): string {
  return BLOB_BASE
    ? `${BLOB_BASE}/content/${topicPath}/${fileName}`
    : `./content/${topicPath}/${fileName}`;
}
