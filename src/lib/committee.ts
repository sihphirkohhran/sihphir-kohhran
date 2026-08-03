import { resolveMediaUrl } from './ministry';

export type CommitteeMember = { name: string; role?: string };

export type CommitteeRecord = {
  committee_id: string;
  committee_name: string;
  year: number;
  group_photo?: string;
  chairman: string;
  secretary: string;
  members: CommitteeMember[];
};

export function committeeKey(committeeId: string, year: number | string): string {
  return `${committeeId}-${year}`;
}

export function resolveCommitteePhoto(photo?: string | null): string {
  return resolveMediaUrl(photo);
}

/** Years per committee id, newest first. */
export function buildYearsByCommittee(
  entries: { data: CommitteeRecord }[],
): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const { data } of entries) {
    if (!map[data.committee_id]) map[data.committee_id] = [];
    if (!map[data.committee_id].includes(data.year)) {
      map[data.committee_id].push(data.year);
    }
  }
  for (const id of Object.keys(map)) {
    map[id].sort((a, b) => b - a);
  }
  return map;
}
