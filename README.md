# QueueSmart

COSC 4353 Assignment 2 frontend, using Next.js, TypeScript, and Tailwind CSS 4.

The shared UI kit adapts [TailAdmin](https://github.com/TailAdmin/free-nextjs-admin-dashboard) with UH colors and optional university branding. See the [component guide](docs/ui-kit.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

Available routes: `/` (landing), `/login` and `/register` (validation-only previews), and `/ui-kit` (interactive component gallery). User/admin feature pages remain for the team to implement. No backend authentication or persistence is included.

## Getting Started

Install the locked dependencies, then run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The landing page is `src/app/page.tsx`. Shared components are in `src/components`; use the component guide before adding page-specific styles.

This project uses `next/font` to load Outfit, matching TailAdmin's typography. A clean build needs access to Google Fonts. Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` to check changes.

Set `showUniversityLogo` in `src/config/branding.ts` to control UH logos throughout the site. This affects the favicon too. The UI gallery's branding toggle changes previews only.
