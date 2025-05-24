export default class DateUtils {
  /**
   * Formats a date into a readable format like "May 22, 2025"
   * @param {string|Date} date - The date to format
   * @returns {string} - Formatted date string
   */
  static formatDate(date) {
    if (!date) return "";
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting readable date:", error);
      return "";
    }
  }
  /**
   * Formats a date string for display in input[type="datetime-local"] fields
   * @param {string|Date} date - The date to format (ISO string or Date object)
   * @returns {string} - Formatted date string (YYYY-MM-DDThh:mm)
   */
  static formatForInput(date) {
    if (!date) return "";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "";
      const offset = dateObj.getTimezoneOffset();
      const localDate = new Date(dateObj.getTime() - offset * 60000);
      return localDate.toISOString().slice(0, 16);
    } catch (error) {
      console.error("Error formatting date for input:", error);
      return "";
    }
  }

  /**
   * Parses a date string from an input field
   * @param {string} dateString - The date string to parse
   * @returns {Date|null} - Date object or null if invalid
   */
  static parseDate(dateString) {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  }

  /**
   * Formats a date for API submission
   * @param {string} inputDate - Date string from input field
   * @returns {string} - Date string in Y-m-d H:i:s format for Laravel
   */
  static formatForApi(inputDate) {
    if (!inputDate) return null;
    try {
      const date = this.parseDate(inputDate);
      if (!date) return null;

      // Format as YYYY-MM-DD HH:mm:ss using local time
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
      console.error("Error formatting date for API:", error);
      return null;
    }
  }

  /**
   * Compares two dates to check if they represent the same date and time
   * @param {string|Date} date1 - First date to compare
   * @param {string|Date} date2 - Second date to compare
   * @returns {boolean} - True if dates are effectively equal
   */
  static areDatesEqual(date1, date2) {
    if (!date1 || !date2) return date1 === date2;
    try {
      const d1 = date1 instanceof Date ? date1 : new Date(date1);
      const d2 = date2 instanceof Date ? date2 : new Date(date2);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
      d1.setMilliseconds(0);
      d2.setMilliseconds(0);
      return d1.getTime() === d2.getTime();
    } catch (error) {
      console.error("Error comparing dates:", error);
      return false;
    }
  }

  /**
   * Checks if the formatted date from the input is different from original API date
   * @param {string} inputDate - The date from datetime-local input
   * @param {string} originalApiDate - The original date from the API
   * @returns {boolean} - True if dates are effectively different
   */
  static hasDateChanged(inputDate, originalApiDate) {
    if (!inputDate || !originalApiDate) return inputDate !== originalApiDate;
    return this.formatForApi(inputDate) !== originalApiDate;
  }

  /**
   * Formats a date string for use with FlatPickr (Y-m-d H:i)
   * @param {string|Date} date - The input date string or object
   * @returns {string} - Formatted date string like "2025-05-22 14:30"
   */
  static toFlatPickrFormat(date) {
    if (!date) return "";
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "";

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error("Error formatting date for FlatPickr:", error);
      return "";
    }
  }

  /**
   * Formats a date into "May 22, 2025 at 03:45 PM"
   * @param {string|Date} date
   * @returns {string}
   */
  static formatDateTime(date) {
    if (!date) return "";
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting date and time:", error);
      return "";
    }
  }
}
