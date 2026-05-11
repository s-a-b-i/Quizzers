import slugify from 'slugify';

export function slugifyName(name) {
  const base = slugify(String(name ?? ''), { lower: true, strict: true });
  return base || 'item';
}

/** Sets `slug` from `name` before save when name is new/changed or slug is empty. */
export function attachAutoSlug(schema) {
  schema.pre('save', function (next) {
    if (this.isModified('name') || (this.isNew && (this.slug === undefined || this.slug === ''))) {
      this.slug = slugifyName(this.name);
    }
    next();
  });
}
