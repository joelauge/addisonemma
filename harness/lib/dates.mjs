/** Ruby strftime, the handful of directives Shopify themes actually use. */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function toDate(input) {
  if (input instanceof Date) return input;
  if (input === 'now' || input === 'today') return new Date();
  if (typeof input === 'number') {
    // Bare unix seconds; milliseconds if it is implausibly large.
    return new Date(input > 1e11 ? input : input * 1000);
  }
  if (typeof input === 'string') {
    if (/^\d+$/.test(input)) return toDate(Number(input));
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function strftime(input, format) {
  const d = toDate(input);
  const pad = (n, width = 2) => String(n).padStart(width, '0');

  return String(format).replace(/%-?[A-Za-z%]/g, (token) => {
    const bare = token.replace('-', '');
    const trim = token.includes('-');
    switch (bare) {
      case '%Y': return String(d.getFullYear());
      case '%y': return pad(d.getFullYear() % 100);
      case '%m': return trim ? String(d.getMonth() + 1) : pad(d.getMonth() + 1);
      case '%B': return MONTHS[d.getMonth()];
      case '%b': return MONTHS[d.getMonth()].slice(0, 3);
      case '%d': return trim ? String(d.getDate()) : pad(d.getDate());
      case '%e': return String(d.getDate());
      case '%A': return DAYS[d.getDay()];
      case '%a': return DAYS[d.getDay()].slice(0, 3);
      case '%H': return pad(d.getHours());
      case '%M': return pad(d.getMinutes());
      case '%S': return pad(d.getSeconds());
      case '%s': return String(Math.floor(d.getTime() / 1000));
      case '%j': return pad(Math.ceil((d - new Date(d.getFullYear(), 0, 0)) / 864e5), 3);
      case '%%': return '%';
      default: return token;
    }
  });
}

/** `| date: format: 'day_month'` resolves through locale date_formats. */
export function namedDate(input, name, formats = {}) {
  const pattern = formats[name] || '%d %B %Y';
  return strftime(input, pattern);
}
