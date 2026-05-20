/**
 * Date helper — always returns Brasília time (UTC-3 / America/Sao_Paulo).
 * Used across the entire application to ensure consistent date/time stamps.
 */

/**
 * Returns the current date/time in Brasília timezone as a formatted string.
 * Format: "YYYY-MM-DD HH:MM:SS"
 */
const brasiliaDatetime = () => {
    const now = new Date();
    // Format in Brasília timezone
    const parts = new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(now);

    const get = (type) => parts.find(p => p.type === type)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
};

/**
 * Returns the current date in Brasília timezone.
 * Format: "YYYY-MM-DD"
 */
const brasiliaDate = () => {
    return brasiliaDatetime().slice(0, 10);
};

/**
 * Returns the current date/time as ISO string in Brasília timezone.
 * This preserves the Brasília time but in ISO-like format.
 */
const brasiliaISO = () => {
    const dt = brasiliaDatetime();
    return dt.replace(' ', 'T') + '-03:00';
};

module.exports = { brasiliaDatetime, brasiliaDate, brasiliaISO };
