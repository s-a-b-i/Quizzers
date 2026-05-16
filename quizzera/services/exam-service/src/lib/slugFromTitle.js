/** Sets `slug` from `title` before save when title is new/changed or slug is empty. */
export function attachAutoSlugFromTitle(schema) {
  schema.pre('save', function (next) {
    if (this.isModified('title') || (this.isNew && (this.slug === undefined || this.slug === ''))) {
      const base = String(this.title ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      this.slug = base || 'exam';
    }
    next();
  });
}
