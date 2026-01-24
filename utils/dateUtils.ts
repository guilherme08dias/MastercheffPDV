export const getBrasiliaDate = (): string => {
    // Returns YYYY-MM-DD in America/Sao_Paulo timezone
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(new Date());
};

export const getBrasiliaCurrentTime = (): string => {
    // Returns ISO string with -03:00 offset explicitly
    const date = new Date();
    const brasiliaTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const offset = '-03:00';

    // Format: YYYY-MM-DDTHH:mm:ss.sss-03:00
    const year = brasiliaTime.getFullYear();
    const month = String(brasiliaTime.getMonth() + 1).padStart(2, '0');
    const day = String(brasiliaTime.getDate()).padStart(2, '0');
    const hours = String(brasiliaTime.getHours()).padStart(2, '0');
    const minutes = String(brasiliaTime.getMinutes()).padStart(2, '0');
    const seconds = String(brasiliaTime.getSeconds()).padStart(2, '0');
    const ms = String(brasiliaTime.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offset}`;
};

export const getBrasiliaDateFromISO = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
};

export const getBrasiliaDateFormatted = (): string => {
    return new Date().toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
    });
};





export const formatBrasiliaDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo'
    });
};
export const formatToBR = (date: string | Date): string => {
    if (!date) return '';

    // If it's a string in YYYY-MM-DD format, convert directly
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}/)) {
        const [year, month, day] = date.slice(0, 10).split('-');
        return `${day}/${month}/${year.slice(2)}`; // DD/MM/YY
    }

    // Fallback for Date objects (but should be avoided)
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
};

export const parseFromBR = (dateString: string): string => {
    // Converts DD/MM/YY or DD/MM/YYYY to YYYY-MM-DD
    if (!dateString) return '';
    const parts = dateString.split('/');
    if (parts.length !== 3) return dateString;

    let [day, month, year] = parts;
    if (year.length === 2) year = '20' + year;

    return `${year}-${month}-${day}`;
};
