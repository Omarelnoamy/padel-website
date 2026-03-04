# Website Refresh Plan – New Logo, Intro Video & Look

Use this plan to roll out your new logo, intro video, and visual updates step by step.

---

## Phase 1: Prepare assets

### 1.1 Logo files
- **Main logo** for navbar and light areas: `starpoint-logo.png` (or `.svg` for sharp scaling).
- **Dark / hero variant** (if your logo has a light version for dark backgrounds): e.g. `starpoint-logo-light.png`.
- **Favicon**: 32×32 and 192×192 (or 512×512) for PWA. Export from your logo or use a simple icon version.

**Where to put them:**
- `public/images/starpoint-logo.png` (replaces current navbar logo).
- Optional: `public/images/starpoint-logo-light.png` for hero/footer.
- Favicon: `src/app/icon.png` and/or `src/app/apple-icon.png` (Next.js 13+), or `public/favicon.ico`.

### 1.2 Intro video
- Export in **MP4** (H.264) and optionally **WebM** for smaller size.
- Keep file size reasonable (e.g. &lt; 5–10 MB) or use a short clip (5–15 s).
- Put file(s) in: `public/videos/` (e.g. `intro.mp4`, `intro.webm`).

### 1.3 Optional: other visuals
- New hero background image (if you’re changing it): e.g. `public/images/padel-hero-bg.png`.
- Any new photos or graphics in `public/images/`.

---

## Phase 2: Replace the logo

### 2.1 Navbar
- **File:** `src/components/Navbar.tsx`
- **Change:** Update the `Image` `src` to your new logo path (e.g. `/images/starpoint-logo.png`).
- **Optional:** If the new logo already includes the word “StarPoint”, you can hide the text “StarPoint” next to it or adjust spacing.
- **Sizing:** Adjust `width`, `height`, and `className` (e.g. `h-10 sm:h-12 md:h-14`) so it looks good on mobile and desktop.

### 2.2 Hero (homepage)
- **File:** `src/app/page.tsx`
- The hero title “StarPoint” comes from **translations** (`t.heroTitle`). Options:
  - **A.** Keep text only and ensure it matches the new brand (font/color already use `#F9D923`).
  - **B.** Replace the text with a logo image: add an `Image` in the hero and use your new logo (and a light variant if the hero stays dark).

### 2.3 Other places
- Search the repo for `starpoint-logo` or “StarPoint” to find footer, emails, or admin areas.
- Replace or add the new logo wherever the brand appears (e.g. login, register, footer).

---

## Phase 3: Add the intro video

Choose one approach (or both with different roles):

### Option A – Hero background / section
- **File:** `src/app/page.tsx`
- Add a `<video>` at the top of the hero (or a full-width section above/below the current hero).
- Use `autoPlay`, `muted`, `loop`, `playsInline` for background-style playback.
- Keep it subtle (e.g. low opacity overlay) so text and CTAs stay readable.

### Option B – Intro modal / overlay (recommended for “intro” feel)
- **File:** New component, e.g. `src/components/IntroVideoModal.tsx`
- On first visit (e.g. `sessionStorage.getItem('introSeen')`), show a modal with the video.
- After video ends (or user skips), set `sessionStorage.setItem('introSeen', 'true')` and close.
- Use a semi-transparent backdrop and a “Skip” button for accessibility.

### 3.1 Video component example (modal)
- Use `<video>` with `src="/videos/intro.mp4"` (and `<source type="video/webm">` if you have WebM).
- Handle `onEnded` to close modal and set `introSeen`.
- Optional: “Replay” link in footer or settings to show intro again.

---

## Phase 4: Site metadata and favicon

### 4.1 Title and description
- **File:** `src/app/layout.tsx`
- Update `metadata.title` and `metadata.description` if your tagline or offer changed.

### 4.2 Favicon and app icons
- **Next.js 13+:** Add `src/app/icon.png` (at least 32×32) and optionally `src/app/apple-icon.png` (e.g. 180×180).
- **Classic:** Add `public/favicon.ico` (32×32).  
The browser will pick these up automatically.

---

## Phase 5: Align colors and style (optional)

- **Navbar** currently uses blue `#1E90FF` for “StarPoint” and active states.
- **Hero** uses yellow `#F9D923`.
- Decide if you want:
  - One primary brand color (e.g. only yellow, or only your new brand color), or
  - Keep yellow for hero/CTAs and blue for nav, but ensure they match the new logo.
- Update in:
  - `src/components/Navbar.tsx` (text color, active link background).
  - `src/styles/custom.css` (hero, buttons, accents).
  - `src/app/page.tsx` (hero text and button classes).

---

## Phase 6: Test and go live

1. **Desktop:** Logo size and alignment in navbar; hero (text or logo); video plays and doesn’t block interaction.
2. **Mobile:** Logo in hamburger menu; video muted/autoplay (required on iOS); modal is tappable and closable.
3. **Performance:** Compress video; use `poster` image for video if needed; lazy-load video when possible (e.g. only when modal opens).
4. **Accessibility:** Alt text for logo; “Skip intro” for video; no motion-only critical info if you respect `prefers-reduced-motion`.

---

## Quick reference – files to touch

| Task              | File(s) |
|-------------------|--------|
| Navbar logo       | `src/components/Navbar.tsx` |
| Hero title/logo    | `src/app/page.tsx`, `src/app/translations.ts` |
| Intro video       | New `src/components/IntroVideoModal.tsx`, `src/app/page.tsx` or `layout.tsx` |
| Metadata/favicon  | `src/app/layout.tsx`, `src/app/icon.png` or `public/favicon.ico` |
| Colors            | `src/components/Navbar.tsx`, `src/styles/custom.css`, `src/app/page.tsx` |
| New images/video  | `public/images/`, `public/videos/` |

---

## Order of work (suggested)

1. Add assets to `public/` (logo, video, favicon).
2. Replace navbar logo.
3. Update hero (text or logo image).
4. Add intro video (modal or hero section).
5. Update metadata and favicon.
6. Optional: unify colors.
7. Test on desktop and mobile, then deploy.

If you tell me your preferred intro behavior (modal vs hero background) and whether the hero should stay text or become a logo image, I can give you exact code changes for those steps.
