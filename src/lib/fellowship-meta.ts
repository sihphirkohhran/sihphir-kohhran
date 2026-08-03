export const fellowshipMeta = {
  'kohhran-hmeichhia': {
    name: 'Kohhran Hmeichhia',
    abbr: 'KH',
    subtitle: 'Sihphir Presbyterian Kohhran',
    accentColor: 'from-rose-900 to-navy',
  },
  ktp: {
    name: 'Kristian Thalai Pawl (KTP)',
    abbr: 'KTP',
    subtitle: 'Sihphir Presbyterian Kohhran',
    accentColor: 'from-blue-900 to-navy',
  },
  kpp: {
    name: 'Kohhran Pavalai Pawl (KPP)',
    abbr: 'KPP',
    subtitle: 'Sihphir Presbyterian Kohhran',
    accentColor: 'from-emerald-900 to-navy',
  },
  'masihi-sangati': {
    name: 'Masihi Sangati',
    abbr: 'MS',
    subtitle: 'Sihphir Presbyterian Kohhran',
    accentColor: 'from-amber-900 to-navy',
  },
} as const;

export type FellowshipSlug = keyof typeof fellowshipMeta;
