// @ts-nocheck
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createICalEvent = createICalEvent;
exports.formatForGCal = formatForGCal;
exports.createGoogleCalendarUrl = createGoogleCalendarUrl;
exports.createOutlookUrl = createOutlookUrl;
function createICalEvent(opts) {
    const uid = opts.uid || `${Date.now()}@ngurra.local`;
    const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dtstart = opts.start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let dtend = '';
    if (opts.end)
        dtend = opts.end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('PRODID:-//Ngurra//Interview Scheduler//EN');
    lines.push('VERSION:2.0');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:REQUEST');
    lines.push('BEGIN:VTIMEZONE');
    lines.push('TZID:UTC');
    lines.push('END:VTIMEZONE');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${dtstart}`);
    if (dtend)
        lines.push(`DTEND:${dtend}`);
    if (opts.location)
        lines.push(`LOCATION:${opts.location}`);
    lines.push(`SUMMARY:${escapeICal(opts.summary)}`);
    if (opts.description)
        lines.push(`DESCRIPTION:${escapeICal(opts.description)}`);
    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}
function escapeICal(s) {
    return s.replace(/\n/g, '\\n').replace(/,/g, '\\,');
}
exports.default = { createICalEvent };
function formatForGCal(d) {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
function createGoogleCalendarUrl(opts) {
    const start = formatForGCal(opts.start);
    const end = opts.end ? formatForGCal(opts.end) : formatForGCal(new Date(opts.start.getTime() + 30 * 60 * 1000));
    const params = new URLSearchParams({ action: 'TEMPLATE', text: opts.summary, dates: `${start}/${end}`, details: opts.details || '', location: opts.location || '' });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
function createOutlookUrl(opts) {
    // Outlook expects ISO datetimes, use full ISO
    const start = opts.start.toISOString();
    const end = (opts.end || new Date(opts.start.getTime() + 30 * 60 * 1000)).toISOString();
    const params = new URLSearchParams({ path: '/calendar/action/compose', startdt: start, enddt: end, subject: opts.subject, body: opts.body || '', location: opts.location || '' });
    return `https://outlook.live.com/owa/?${params.toString()}`;
}

export {};
