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
      pin_code: z.string().optional(),
      village_town: z.string().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      phone_number: z.string().optional(),
      mobile_number: z.string().optional(),
      whatsapp_number: z.string().optional(),
      email: z.string().optional(),
      website_url: z.string().optional(),
      office_hours: z.string().optional(),
      google_maps_embed_url: z.string().optional(),
      twitter_url: z.string().optional(),
      telegram_url: z.string().optional(),
      whatsapp_channel_url: z.string().optional(),
      show_home_contact: z.boolean().optional(),
      looker_url: z.string().optional(),
      slides: z
        .array(z.object({ src: z.string(), caption: z.string() }))
        .optional(),
      stats: z
        .array(z.object({ label: z.string(), value: z.string() }).passthrough())
        .optional(),
      name: z.string().optional(),
      title: z.string().optional(),
      photo: z.string().optional(),
      message: z.string().optional(),
      building_photo: z.string().optional(),
      short: z.string().optional(),
      full: z.string().optional(),
      topics: z
        .array(z.union([z.string(), z.object({ topic: z.string(), display_order: z.number().optional() })]))
        .optional(),
      enabled: z.boolean().optional(),
      heading: z.string().optional(),
      subtitle: z.string().optional(),
      max_visible: z.number().optional(),
      visibility: z.record(z.boolean()).optional(),
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
          }).passthrough(),
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
    })
    .passthrough(),
});

const fellowship = defineCollection({
  type: 'data',
  schema: z.object({
    fellowship_name: z.string().optional(),
    slug: z.string().optional(),
    established_year: z.number().optional(),
    motto: z.string().optional(),
    short_description: z.string().optional(),
    full_history: z.string().optional(),
    cover_photo: z.string().optional(),
    year: z.number().optional(),
    banner_image: z.string().optional(),
    bible_verse: z.string().optional(),
    meeting_day: z.string().optional(),
    meeting_time: z.string().optional(),
    venue: z.string().optional(),
    contact: z.string().optional(),
    homepage_visible: z.boolean().optional(),
    homepage_order: z.number().optional(),
    history_short: z.string().default(''),
    history_full: z.string().default(''),
    logo: z.string().optional(),
    group_photo: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    display_order: z.number().optional(),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
    updated_at: z.string().optional(),
    status: z.enum(['current', 'archived']).optional(),
    group_photos: z
      .array(z.object({ year: z.number(), photo: z.string() }))
      .optional(),
    related_galleries: z.array(z.string()).optional(),
    related_documents: z.array(z.string()).optional(),
    office_bearers: z.array(
      z.object({ role: z.string(), name: z.string(), photo: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), display_order: z.number().optional() }).passthrough(),
    ).default([]),
    members: z.array(
      z.object({ name: z.string(), role: z.string().optional(), designation: z.string().optional(), photo: z.string().optional(), notes: z.string().optional(), display_order: z.number().optional() }).passthrough(),
    ).default([]),
  }).passthrough(),
});

const committee = defineCollection({
  type: 'content',
  schema: z.object({
    committee_id: z.string(),
    committee_name: z.string(),
    year: z.number(),
    group_photo: z.string().optional(),
    description: z.string().optional(),
    display_order: z.number().optional(),
    status: z.enum(['current', 'archived']).optional(),
    chairman: z.string(),
    secretary: z.string(),
    members: z.array(
      z.object({ name: z.string(), role: z.string().optional(), designation: z.string().optional(), photo: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), bio: z.string().optional(), notes: z.string().optional(), display_order: z.number().optional() }),
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
    designation: z.string().optional(), date_of_birth: z.string().optional(), ordination_year: z.number().optional(), church_served: z.string().optional(), education: z.string().optional(), family_information: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), year: z.number().optional(), record_status: z.enum(['Current','Former']).optional(), short_description: z.string().optional(), biography: z.string().optional(), bible_verse: z.string().optional(), pastor_message: z.string().optional(), family_photo: z.string().optional(), featured: z.boolean().optional(), published: z.boolean().optional(), enabled: z.boolean().optional(), seo_title: z.string().optional(), seo_description: z.string().optional(), cover_photo: z.string().optional(), motto: z.string().optional(), contact: z.string().optional(), display_order: z.number().optional(), status: z.string().optional(), archived: z.boolean().optional(), gallery: z.array(z.string()).optional(), documents: z.array(z.string()).optional(), certificates: z.array(z.string()).optional(),
  }).passthrough(),
});

const proPastoral = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(), photo: z.string().optional(), family_photo: z.string().optional(), designation: z.string().optional(), biography: z.string().optional(), date_of_birth: z.string().optional(), ordination_year: z.number().optional(), start_year: z.number(), end_year: z.number().optional(), record_status: z.enum(['Current','Former']).optional(), church_served: z.string().optional(), education: z.string().optional(), family_information: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), notes: z.string().optional(), bible_verse: z.string().optional(), gallery: z.array(z.string()).optional(), documents: z.array(z.string()).optional(), display_order: z.number().optional(), published: z.boolean().optional(), archived: z.boolean().optional(),
  }).passthrough(),
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
    designation: z.string().optional(), date_of_birth: z.string().optional(), ordination_year: z.number().optional(), church_served: z.string().optional(), education: z.string().optional(), family_information: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), start_year: z.number().optional(), end_year: z.number().optional(), year: z.number().optional(), record_status: z.enum(['Current','Former']).optional(), short_description: z.string().optional(), biography: z.string().optional(), featured: z.boolean().optional(), published: z.boolean().optional(), seo_title: z.string().optional(), seo_description: z.string().optional(), cover_photo: z.string().optional(), motto: z.string().optional(), contact: z.string().optional(), display_order: z.number().optional(), archived: z.boolean().optional(), gallery: z.array(z.string()).optional(), documents: z.array(z.string()).optional(), certificates: z.array(z.string()).optional(),
  }).passthrough(),
});

const elders = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    photo: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
    designation: z.string().optional(), ordination_date: z.string().optional(), date_of_birth: z.string().optional(), ordained_year: z.number().optional(), legacy_ordained_year: z.number().optional(), ordination_year: z.number().optional(), church_served: z.string().optional(), education: z.string().optional(), family_information: z.string().optional(), phone: z.string().optional(), email: z.string().optional(), address: z.string().optional(), start_year: z.number().optional(), end_year: z.number().optional(), year: z.number().optional(), record_status: z.enum(['Current','Former']).optional(), short_description: z.string().optional(), biography: z.string().optional(), family_photo: z.string().optional(), featured: z.boolean().optional(), published: z.boolean().optional(), seo_title: z.string().optional(), seo_description: z.string().optional(), cover_photo: z.string().optional(), motto: z.string().optional(), contact: z.string().optional(), display_order: z.number().optional(), archived: z.boolean().optional(), gallery: z.array(z.string()).optional(), documents: z.array(z.string()).optional(), certificates: z.array(z.string()).optional(),
  }).passthrough().transform(data => ({ ...data, ordained_year: data.ordained_year ?? data.legacy_ordained_year })),
});

const photoEntry = z.union([
  z.string(),
  z.object({
    photo: z.string().optional(),
    src: z.string().optional(),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
]);

const gallery = defineCollection({
  type: 'content',
  schema: z.object({
    caption: z.string(),
    year: z.number(),
    category: z.string(),
    date: z.string().optional(),
    description: z.string().optional(),
    display_order: z.number().optional(),
    status: z.enum(['current', 'archived']).optional(),
    tags: z.array(z.string()).optional(),
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
  duties: z.array(z.object({
    role: z.string(),
    name: z.string(),
    time: z.string().optional(),
    title: z.string().optional(),
    person_responsible: z.string().optional(),
    speaker: z.string().optional(),
    bible_text: z.string().optional(),
    notes: z.string().optional(),
  })),
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
    status: z.enum(['current', 'upcoming', 'archived']).optional(),
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
    description: z.string().optional(),
    cover_image: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    display_order: z.number().optional(),
    featured: z.boolean().optional(),
    is_new: z.boolean().optional(),
    published: z.boolean().optional(),
    files: z.array(z.object({
      url: z.string(),
      filename: z.string().optional(),
      size: z.number().optional(),
      uploaded_at: z.string().optional(),
      modified_at: z.string().optional(),
      type: z.string().optional(),
    })).optional(),
    status: z.enum(['current', 'archived']).optional(),
  }),
});

export const collections = {
  settings,
  fellowship,
  committee,
  pastoral,
  proPastoral,
  missionaries,
  elders,
  gallery,
  pages,
  notices,
  documents,
};
