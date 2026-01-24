// Utility functions for string manipulation and formatting

/**
 * Remove accents and special characters from strings
 * Used for WhatsApp messages and print outputs to avoid encoding issues
 */
export const removeAccents = (str: string): string => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/gi, ''); // Remove special chars except spaces
};

/**
 * Format currency value safely
 * Always returns a valid string even if value is null/undefined
 */
export const formatCurrency = (value: number | null | undefined): string => {
    return `R$ ${(value || 0).toFixed(2)}`;
};

/**
 * Format phone number for WhatsApp
 * Removes all non-numeric characters
 */
export const formatPhoneForWhatsApp = (phone: string): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
};

/**
 * Sanitize string for printing
 * Removes accents and limits length
 */
export const sanitizeForPrint = (str: string, maxLength: number = 50): string => {
    if (!str) return '';
    const clean = removeAccents(str);
    return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
};
