/** Medios aportados por la comunidad (fotos + 1 vídeo YouTube) por receta. */

import data from './community-media.json' with { type: 'json' };
import { slugify } from './slug';

export interface CommunityPhoto {
  file: string;
  contributor: string;
  link?: string | null;
  caption?: string | null;
  date?: string | null;
}

export interface CommunityVideo {
  youtubeId: string;
  contributor: string;
  link?: string | null;
  title?: string | null;
  date?: string | null;
}

interface RawEntry {
  photos?: CommunityPhoto[];
  video?: CommunityVideo | null;
}

export interface ResolvedPhoto extends CommunityPhoto {
  src: string;
  alt: string;
}

export interface CommunityMedia {
  photos: ResolvedPhoto[];
  video: CommunityVideo | null;
}

const RAW = data as Record<string, RawEntry>;

function dirFor(id: number, title: string): string {
  const idPad = String(id).padStart(4, '0');
  return `/img/comunidad/${idPad}-${slugify(title)}`;
}

export function getCommunityMedia(id: number, title: string): CommunityMedia {
  const entry = RAW[String(id)];
  if (!entry) return { photos: [], video: null };
  const dir = dirFor(id, title);
  const photos = (entry.photos ?? []).map((p) => ({
    ...p,
    src: `${dir}/${p.file}`,
    alt: p.caption?.trim() || `${title} — foto de ${p.contributor}`,
  }));
  return {
    photos,
    video: entry.video ?? null,
  };
}

export interface ContributorAggregate {
  name: string;
  link: string | null;
  photoCount: number;
  videoCount: number;
  recipes: Array<{ id: number; title: string }>;
}

export function getAllContributors(
  resolveTitle: (id: number) => string | null,
): ContributorAggregate[] {
  const byName = new Map<string, ContributorAggregate>();
  for (const [idStr, entry] of Object.entries(RAW)) {
    const id = Number(idStr);
    const title = resolveTitle(id);
    if (!title) continue;
    const touch = (name: string, link: string | null | undefined, kind: 'photo' | 'video') => {
      const key = name.trim();
      if (!key) return;
      let agg = byName.get(key);
      if (!agg) {
        agg = { name: key, link: link ?? null, photoCount: 0, videoCount: 0, recipes: [] };
        byName.set(key, agg);
      }
      if (kind === 'photo') agg.photoCount += 1;
      else agg.videoCount += 1;
      if (!agg.recipes.find((r) => r.id === id)) agg.recipes.push({ id, title });
      if (!agg.link && link) agg.link = link;
    };
    for (const p of entry.photos ?? []) touch(p.contributor, p.link, 'photo');
    if (entry.video) touch(entry.video.contributor, entry.video.link, 'video');
  }
  return Array.from(byName.values()).sort(
    (a, b) => (b.photoCount + b.videoCount) - (a.photoCount + a.videoCount),
  );
}

export function getAllRecipeIdsWithMedia(): number[] {
  return Object.keys(RAW).map((k) => Number(k)).filter((n) => Number.isFinite(n));
}
