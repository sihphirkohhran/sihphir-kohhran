import { defineCollection, z } from 'astro:content';

const settings = defineCollection({
  type: 'data',
  schema: z.object({
    church_name: z.string().optional(),
    founded_year: z.string().optional(),
    facebook_url: z.string().optional(),
    youtube_url: z.string().optional(),
    secretary_name: z.string().optional(),
    secretary_phone: z.string().optional(),
    secretary_email: z.string().optional(),
    address: z.string().optional(),
    looker_url: z.string().optional(),
    slides: z
      .array(
        z.object({
          src: z.string(),
          caption: z.string(),
        }),
      )
      .optional(),
    stats: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
        }),
      )
      .optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    photo: z.string().optional(),
    message: z.string().optional(),
    building_photo: z.string().optional(),
    short: z.string().optional(),
    full: z.string().optional(),
    topics: z.array(z.string()).optional(),
    items: z
      .array(
        z.object({
          label: z.string(),
          href: z.string(),
          visible: z.boolean().optional(),
        }),
      )
      .optional(),
  }),
});

const fellowship = defineCollection({
  type: 'data',
  schema: z.object({
    history_short: z.string(),
    history_full: z.string(),
    office_bearers: z.array(
      z.object({
        role: z.string(),
        name: z.string(),
      }),
    ),
    members: z.array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
      }),
    ),
  }),
});

const committee = defineCollection({
  type: 'content',
  schema: z.object({
    committee_id: z.string(),
    committee_name: z.string(),
    year: z.number(),
    chairman: z.string(),
    secretary: z.string(),
    members: z.array(
      z.object({
        name: z.string(),
        role: z.string().optional(),
      }),
    ),
  }),
});

const gallery = defineCollection({
  type: 'content',
  schema: z.object({
    caption: z.string(),
    photo: z.string(),
    category: z.string(),
    date: z.string().optional(),
  }),
});

export const collections = {
  settings,
  fellowship,
  committee,
  gallery,
};
