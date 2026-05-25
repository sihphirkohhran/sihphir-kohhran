export const fellowshipMeta = {
  'kohhran-hmeichhia': {
    name: 'Kohhran Hmeichhia',
    abbr: 'KH',
    subtitle: "Women's Fellowship · Sihphir Presbyterian Kohhran",
    accentColor: 'from-rose-900 to-navy',
  },
  ktp: {
    name: 'Kristian Thalai Pawl (KTP)',
    abbr: 'KTP',
    subtitle: 'Christian Youth Fellowship · Sihphir Presbyterian Kohhran',
    accentColor: 'from-blue-900 to-navy',
  },
  kpp: {
    name: 'Kohhran Pavalai Pawl (KPP)',
    abbr: 'KPP',
    subtitle: "Senior Citizens' Fellowship · Sihphir Presbyterian Kohhran",
    accentColor: 'from-emerald-900 to-navy',
  },
  'masihi-sangai': {
    name: 'Masihi Sangai',
    abbr: 'MS',
    subtitle: 'Christian Fellowship · Sihphir Presbyterian Kohhran',
    accentColor: 'from-amber-900 to-navy',
  },
} as const;

export type FellowshipSlug = keyof typeof fellowshipMeta;
