export type FellowshipGroupPhoto = {
  year: number;
  photo: string;
};

export function resolveGroupPhotos(data: {
  group_photo?: string;
  group_photos?: FellowshipGroupPhoto[];
}): FellowshipGroupPhoto[] {
  const list = [...(data.group_photos ?? [])].filter((g) => g.photo);
  if (data.group_photo && !list.some((g) => g.photo === data.group_photo)) {
    list.push({ year: new Date().getFullYear(), photo: data.group_photo });
  }
  return list.sort((a, b) => b.year - a.year);
}
