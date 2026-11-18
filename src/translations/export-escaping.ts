/**
 * Escaping helpers for platform-specific export formats.
 */

/** Escapes a key or value for Apple `.strings` files: "key" = "value"; */
export const escapeAppleStrings = (value: string = ''): string => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\r/g, '\\r')
  .replace(/\n/g, '\\n')
  .replace(/\t/g, '\\t');

/**
 * Escapes a value for Android `<string>` resources.
 * XML entities (&, <, >) are escaped later by the XML serializer.
 */
export const escapeAndroidString = (value: string = ''): string => String(value)
  .replace(/\\/g, '\\\\')
  .replace(/'/g, "\\'")
  .replace(/"/g, '\\"')
  .replace(/\r/g, '\\r')
  .replace(/\n/g, '\\n')
  .replace(/\t/g, '\\t')
  .replace(/^([@?])/, '\\$1');

/**
 * Converts a key path into a valid Android resource name.
 * Allowed characters: letters, digits, underscore and dot; must not start with a digit.
 */
export const toAndroidResourceName = (name: string): string => {
  const sanitized = String(name).replace(/[^A-Za-z0-9_.]/g, '_');

  return /^[0-9]/.test(sanitized) ? `_${sanitized}` : sanitized;
};
