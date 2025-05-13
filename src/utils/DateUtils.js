import { format, parseISO, isValid } from "date-fns";

/**
 * Comprehensive date handling utilities for consistent date formatting
 * throughout the application
 */
export default {
  /**
   * Format a date string or object for display
   * @param {string|Date} dateValue - The date to format
   * @param {string} formatStr - The format string (default: 'MMMM d, yyyy h:mm a')
   * @returns {string} - Formatted date string or fallback text
   */
  formatDate(dateValue, formatStr = "MMMM d, yyyy h:mm a") {
    if (!dateValue) return "Not set";

    let date;

    try {
      // Handle different input types
      if (dateValue instanceof Date) {
        date = dateValue;
      }
      // ISO format from API (with T separator and timezone)
      else if (typeof dateValue === "string" && dateValue.includes("T")) {
        date = new Date(dateValue);
      }
      // MySQL datetime format (YYYY-MM-DD HH:MM:SS)
      else if (typeof dateValue === "string" && dateValue.includes(" ")) {
        const [datePart, timePart] = dateValue.split(" ");
        // Construct valid ISO string and parse
        date = new Date(`${datePart}T${timePart}Z`);
      }
      // Fallback for any other format
      else {
        date = new Date(dateValue);
      }

      // Validate the date is valid before formatting
      if (!isValid(date)) {
        return "Invalid date";
      }

      return format(date, formatStr);
    } catch (error) {
      console.error("Date formatting error:", error, dateValue);
      return "Invalid date";
    }
  },

  /**
   * Format a date object or string for API submission (YYYY-MM-DD HH:MM:SS)
   * @param {Date|string} dateValue - The date to format
   * @returns {string|null} - MySQL format date string or null
   */
  formatForApi(dateValue) {
    if (!dateValue) return null;

    try {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
      if (!isValid(date)) return null;

      // Format specifically for API/MySQL (YYYY-MM-DD HH:MM:SS)
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch (error) {
      console.error("API date formatting error:", error, dateValue);
      return null;
    }
  },

  /**
   * Parse a date string into a Date object handling multiple formats
   * @param {string} dateStr - Date string to parse
   * @returns {Date|null} - Date object or null if invalid
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      let date;

      // ISO format (with T separator)
      if (dateStr.includes("T")) {
        date = parseISO(dateStr);
      }
      // MySQL datetime format
      else if (dateStr.includes(" ")) {
        const [datePart, timePart] = dateStr.split(" ");
        date = parseISO(`${datePart}T${timePart}`);
      }
      // Fallback for other formats
      else {
        date = new Date(dateStr);
      }

      return isValid(date) ? date : null;
    } catch (error) {
      console.error("Date parsing error:", error, dateStr);
      return null;
    }
  },

  /**
   * Format a date for input fields (YYYY-MM-DDTHH:MM)
   * @param {string|Date} dateValue - The date to format
   * @returns {string} - Formatted date string for HTML datetime-local inputs
   */
  formatForInput(dateValue) {
    if (!dateValue) return "";

    try {
      const date =
        dateValue instanceof Date ? dateValue : this.parseDate(dateValue);
      if (!date || !isValid(date)) return "";

      return format(date, "yyyy-MM-dd'T'HH:mm");
    } catch (error) {
      console.error("Input date formatting error:", error, dateValue);
      return "";
    }
  },
};
