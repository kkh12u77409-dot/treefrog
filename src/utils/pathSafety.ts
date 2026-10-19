/** Portable paths, independent of the browser/host OS. */
export function validateRelativePath(value: string): string {
  if (typeof value !== 'string' || !value || /^[\\/]|^[a-z]:/i.test(value)) {
    throw new Error('An explicit relative path is required');
  }
  const normalized = value.replace(/\\/g, '/');
  for (const part of normalized.split('/')) {
    if (!part || part === '.' || part === '..' || /[. ]$/.test(part) ||
        /[\x00-\x1f<>:"|?*]/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(part.split('.')[0])) {
      throw new Error(`Unsafe path component: ${part}`);
    }
  }
  return normalized;
}

export function validateName(value: string): string {
  const clean = validateRelativePath(value);
  if (clean.includes('/')) throw new Error('A name cannot contain path separators');
  return clean;
}
