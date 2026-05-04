/**
 * QUIZZERA frontend color system — single source of truth.
 * Tailwind reads this via tailwind.config.js; update values here to restyle the site.
 *
 * Naming (monochrome):
 * - primary      Main ink, primary actions, dark panels
 * - primary-hover Hover state for filled primary buttons
 * - secondary    Muted copy, subtitles, dividers text
 * - tertiary     Placeholders, disabled hints, icon strokes
 * - background   Page / canvas white
 * - border       Hairlines, input borders, outlines
 * - surface      Subtle fills (cards, ghost button hover)
 * - inverse      Text/icons on top of primary (white)
 * - dot          Dot-grid texture on dark panel (slightly lighter than panel)
 */
module.exports = {
  primary: '#111111',
  'primary-hover': '#333333',
  secondary: '#6B6B6B',
  tertiary: '#AAAAAA',
  background: '#FFFFFF',
  border: '#E5E5E5',
  surface: '#F9F9F9',
  inverse: '#FFFFFF',
  dot: '#1E1E1E',
};
