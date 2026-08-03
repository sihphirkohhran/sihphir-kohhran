import { defineCollection, z } from 'astro:content';

const settings = defineCollection({
  type: 'data',
  schema: z
    .object({
      church_name: z.string().optional(),
      founded_year: z.string().optional(),
      facebook_url: z.string().optional(),
      instagram_url: z.string().optional(),
      youtube_url: z.string().optional(),
      secretary_name: z.string().optional(),
      secretary_phone: z.string().optional(),
      secretary_email: z.string().optional(),
      address: z.string().optional(),
      looker_url: z.string().optional(),
      slides: z
        .array(z.object({ src: z.string(), caption: z.string() }))
        .optional(),
      stats: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .optional(),
      name: z.string().optional(),
      title: z.string().optional(),
      photo: z.string().optional(),
      message: z.string().optional(),
      building_photo: z.string().optional(),
      short: z.string().optional(),
      full: z.string().optional(),
      topics: z
        .array(z.union([z.string(), z.object({ topic: z.string() })]))
        .optional(),
      items: z
        .array(
          z
            .object({
              label: z.string().optional(),
              href: z.string().optional(),
              title: z.string().optional(),
              link: z.string().optional(),
              key: z.string().optional(),
              visible: z.boolean().optional(),
              order: z.number().optional(),
              parent: z.string().optional(),
              enabled: z.boolean().optional(),
              type: z.enum(['page', 'photo', 'document']).optional(),
              description: z.string().optional(),
              image: z.string().optional(),
              style: z.enum(['card', 'button', 'banner']).optional(),
            })
            .passthrough(),
        )
        .optional(),
      links: z
        .array(
          z.object({
            label: z.string(),
            description: z.string().optional(),
            href: z.string(),
            action: z.string().optional(),
          }),
        )
        .optional(),
      highlights: z
        .array(
          z.object({
            enabled: z.boolean().optional(),
            type: z.enum(['page', 'photo', 'document']).optional(),
            title: z.string(),
            description: z.string().optional(),
            link: z.string(),
            image: z.string().optional(),
            style: z.enum(['card', 'button', 'banner']).optional(),
          }),
        )
        .optional(),
      committees: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            is_main: z.boolean().optional(),
          }),
        )
        .optional(),
      categories: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            badge: z.string().optional(),
          }),
        )
        .optional(),
      login_title: z.string().optional(),
      login_subtitle: z.string().optional(),
      local_password: z.string().optional(),
      session_hours: z.number().optional(),
    })
    .passthrough(),
});

const fellowship = defineCollection({
  type: 'data',
  schema: z.object({
    history_short: z.string(),
    history_full: z.string(),
    logo: z.string().optional(),
    group_photo: z.string().optional(),
    group_photos: z
      .array(z.object({ year: z.number(), photo: z.string() }))
      .optional(),
    office_bearers: z.array(
      z.object({ role: z.string(), name: z.string() }),
    ),
    members: z.array(
      z.object({ name: z.string(), role: z.string().optional() }),
    ),
  }),
});

const committee = defineCollection({
  type: 'content',
  schema: z.object({
    committee_id: z.string(),
    committee_name: z.string(),
    year: z.number(),
    group_photo: z.string().optional(),
    chairman: z.string(),
    secretary: z.string(),
    members: z.array(
      z.object({ name: z.string(), role: z.string().optional() }),
    ),
  }),
});

const pastoral = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    photo: z.string().optional(),
    role: z.enum(['pastor', 'pro-pastor']).optional(),
    start_year: z.number(),
    end_year: z.number().optional(),
    notes: z.string().optional(),
  }),
});

const missionaries = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    photo: z.string().optional(),
    mission_field: z.string(),
    sent_year: z.number(),
    status: z.string(),
    notes: z.string().optional(),
    prayer_requests: z.string().optional(),
    family_photo: z.string().optional(),
  }),
});

const elders = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    photo: z.string().optional(),
    ordained_year: z.number(),
    status: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const photoEntry = z.union([
  z.string(),
  z.object({ photo: z.string().optional(), src: z.string().optional() }),
]);

const gallery = defineCollection({
  type: 'content',
  schema: z.object({
    caption: z.string(),
    year: z.number(),
    category: z.string(),
    date: z.string().optional(),
    photo: z.string().optional(),
    photos: z.array(photoEntry).optional(),
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    path: z.string().optional(),
    nav_key: z.string().optional(),
    show_in_nav: z.boolean().optional(),
    nav_order: z.number().optional(),
    nav_parent: z.string().optional(),
  }),
});

const dutyDay = z.object({
  day: z.string(),
  duties: z.array(z.object({ role: z.string(), name: z.string() })),
});

const monthlySection = z.object({
  title: z.string(),
  duties: z.array(
    z.object({ role: z.string().optional(), name: z.string() }),
  ),
});

/** Weekly, monthly, and announcement notices under src/content/notices/ */
const notices = defineCollection({
  type: 'content',
  schema: z.object({
    week_start: z.string().optional(),
    week_end: z.string().optional(),
    days: z.array(dutyDay).optional(),
    month: z.string().optional(),
    sections: z.array(monthlySection).optional(),
    title: z.string().optional(),
    date: z.string().optional(),
    pdf_url: z.string().optional(),
  }),
});

/** KTP Inleng and other documents under src/content/documents/ */
const documents = defineCollection({
  type: 'content',
  schema: z.object({
    year: z.number().optional(),
    month: z.number().optional(),
    name: z.string(),
    date: z.string().optional(),
    pdf_url: z.string().optional(),
    pdf_external: z.string().optional(),
    category: z.string().optional(),
    pinned: z.boolean().optional(),
  }),
});

export const collections = {
  settings,
  fellowship,
  committee,
  pastoral,
  missionaries,
  elders,
  gallery,
  pages,
  notices,
  documents,
};
