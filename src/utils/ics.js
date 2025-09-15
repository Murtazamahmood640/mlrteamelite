export function buildICS({ title, description = '', location = '', start, end, url }) {
  const dt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//EventSphere//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end || start)}`,
    `SUMMARY:${escapeICal(title)}`,
    `DESCRIPTION:${escapeICal(description)}`,
    `LOCATION:${escapeICal(location)}`,
    url ? `URL:${url}` : null,
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean);
  return lines.join('\r\n');
}

function escapeICal(str='') {
  return String(str).replace(/[\\,;\n]/g, (m) => ({'\\':'\\\\', ',':'\\,', ';':'\\;', '\n':'\\n'}[m]));
}
