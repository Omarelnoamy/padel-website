// Central image registry. Prefer placing real files under `public/images` and refer to them here.
// Example: put a file at public/images/ayman-tournament-logo.png and keep the constant below.

export const IMAGES = {
  AYMAN_TOURNAMENT_LOGO: "/images/ayman-tournament-logo.png",
  // Temporary fallbacks (remote). Replace with local files in public/ when ready.
  PLACEHOLDER_LOGO:
    "https://dummyimage.com/256x256/1e3a8a/ffffff.png&text=Ayman+Logo",
};

export type ImageKey = keyof typeof IMAGES;
