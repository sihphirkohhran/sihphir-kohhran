# Sihphir Presbyterian Kohhran — Website Setup Guide

## What You Need (Already Done ✅)
- VS Code installed
- Git Bash installed
- Node.js installed
- GitHub account (free) — create at github.com if you don't have one
- Cloudflare account (free) — create at cloudflare.com

---

## STEP 1 — Open the project in VS Code

1. Open VS Code
2. Click **File → Open Folder**
3. Select your `sihphir kohhran` folder (where you put these files)

---

## STEP 2 — Install dependencies

1. In VS Code, press **Ctrl + `** (backtick) to open the terminal
2. Type this command and press Enter:

```
npm install
```

Wait for it to finish (it downloads the required packages).

---

## STEP 3 — Test the website locally

In the terminal, type:

```
npm run dev
```

Then open your browser and go to: **http://localhost:4321**

You should see your website! Press **Ctrl+C** in the terminal to stop it.

---

## STEP 4 — Upload to GitHub

1. Go to **github.com** and create a **New Repository**
   - Name: `sihphir-kohhran`
   - Set to **Public**
   - Click **Create repository**

2. In VS Code terminal, run these commands one by one:

```
git init
git add .
git commit -m "Initial commit — Sihphir Kohhran website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/sihphir-kohhran.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username.

---

## STEP 5 — Deploy to Cloudflare Pages (Free Hosting)

1. Go to **dash.cloudflare.com**
2. Click **Pages** in the left menu
3. Click **Create a project** → **Connect to Git**
4. Select your `sihphir-kohhran` repository
5. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
6. Click **Save and Deploy**

Your site will be live at: `sihphir-kohhran.pages.dev`

---

## STEP 6 — Connect your domain

1. In Cloudflare Pages project, go to **Custom Domains**
2. Click **Set up a custom domain**
3. Enter: `sihphirpresbyteriankohhran.org`
4. In Squarespace, update DNS settings:
   - Add **CNAME** record: `www` → `sihphir-kohhran.pages.dev`
   - Add **CNAME** record: `@` → `sihphir-kohhran.pages.dev`

---

## STEP 7 — Enable Admin Panel (Decap CMS)

### Local editing (on your computer)

Run **two terminals** in the project folder:

```
npm run dev
```

```
npm run cms
```

Then open: **http://localhost:4321/admin**

The CMS saves files into `src/content/` (settings, notices, documents, gallery, committee, fellowship).

### Production (Netlify)

1. Deploy the site to **Netlify** (connect your GitHub repo)
2. In Netlify site settings → **Identity** → Enable Identity
3. Under Identity → **Services** → Enable **Git Gateway**
4. Under Identity → **Registration** → set to Invite only (recommended)
5. Visit `https://YOUR-SITE.netlify.app/admin` and log in

`public/admin/config.yml` is already set for `git-gateway` + `local_backend`.

---

## HOW TO UPDATE THE WEBSITE (For Church Secretary)

### Adding a new KTP Inleng:
1. Go to `yourdomain.com/admin`
2. Log in
3. Click **"KTP Inleng (Weekly Bulletins)"**
4. Click **"New KTP Inleng Issue"**
5. Fill in the date and upload the PDF
6. Click **Publish** — done! The PDF appears on the website automatically.

### Updating the Weekly Schedule:
1. Go to Admin → **Weekly Schedule**
2. Click **New Weekly Schedule Entry**
3. Fill in the services and duties
4. Click **Publish**

### Updating Statistics:
1. Go to Admin → **Homepage → Statistics at a Glance**
2. Update the numbers
3. Click **Save**

### Adding Gallery Photos:
1. Go to Admin → **Gallery Photos**
2. Click **New Photo**
3. Upload image, add caption and category
4. Click **Publish**

---

## PROJECT FILE STRUCTURE

```
sihphir-kohhran/
├── src/
│   ├── pages/
│   │   ├── index.astro          ← Home page
│   │   ├── committee.astro      ← Committee page
│   │   ├── gallery.astro        ← Gallery page
│   │   ├── document.astro       ← Documents page
│   │   └── fellowship/
│   │       ├── index.astro      ← Fellowship list
│   │       ├── kohhran-hmeichhia.astro
│   │       ├── ktp.astro
│   │       ├── kpp.astro
│   │       └── masihi-sangati.astro
│   ├── layouts/
│   │   └── BaseLayout.astro     ← Header, nav, footer (shared)
│   ├── components/
│   │   └── FellowshipPage.astro ← Reusable fellowship template
│   ├── styles/
│   │   └── global.css           ← All custom CSS + animations
│   └── content/                 ← CMS content files (editable)
├── public/
│   ├── admin/
│   │   ├── index.html           ← Admin panel entry
│   │   └── config.yml           ← Admin panel configuration
│   ├── images/                  ← Upload your photos here
│   └── favicon.svg
├── package.json
├── astro.config.mjs
└── tailwind.config.mjs
```

---

## ADDING YOUR PHOTOS

Place your images in the `public/images/` folder:
- `public/images/hero-1.jpg` — Hero slideshow photo 1
- `public/images/hero-2.jpg` — Hero slideshow photo 2
- `public/images/pastor.jpg` — Pastor's photo
- `public/images/church-building.jpg` — Church building photo
- `public/images/gallery-1.jpg` through `gallery-18.jpg` — Gallery photos
- `public/pci-logo.png` — PCI logo/emblem

---

## NEED HELP?

If anything doesn't work, check:
1. Is Node.js installed? Run `node --version` in terminal
2. Did `npm install` complete without errors?
3. Is the GitHub repository public?

For domain issues, check Squarespace DNS settings match Cloudflare instructions.
