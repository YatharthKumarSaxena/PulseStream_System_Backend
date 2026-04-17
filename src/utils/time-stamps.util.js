/**
 * Timestamp Utility
 * Provides timestamp and logging utilities with timestamps
 */

const getTimeStamp = () => {
  const now = new Date();

  const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][now.getDay()];
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  const tzOffset = -now.getTimezoneOffset(); // in minutes
  const tzHours = Math.floor(Math.abs(tzOffset) / 60);
  const tzMinutes = Math.abs(tzOffset) % 60;
  const tzSign = tzOffset >= 0 ? '+' : '-';
  const timezone = `UTC${tzSign}${String(tzHours).padStart(2, '0')}:${String(tzMinutes).padStart(2, '0')}`;

  return `[${dayName}, ${day} ${month} ${year}, ${hours}:${minutes}:${seconds} ${timezone}]`;
};

/**
 * Log message with current timestamp
 * @param {string} message - Message to log
 */
const logWithTime = (...args) => {
  console.log(`🕒 ${getTimeStamp()}`, ...args);
};

/**
 * Get current time in milliseconds (epoch)
 * @returns {number} Current timestamp in milliseconds
 */
const getCurrentTimeInMillis = () => {
    return Date.now();
};

/**
 * Get timestamp from 2 hours ago in milliseconds
 * @returns {number} Timestamp 2 hours ago in milliseconds
 */
const getTwoHoursAgoInMillis = () => {
    return Date.now() - (2 * 60 * 60 * 1000);
};

/**
 * Get timestamp from N minutes ago in milliseconds
 * @param {number} minutes - Number of minutes in the past
 * @returns {number} Timestamp N minutes ago in milliseconds
 */
const getMinutesAgoInMillis = (minutes) => {
    return Date.now() - (minutes * 60 * 1000);
};

/**
 * Get formatted timestamp string
 * @param {number} timestamp - Timestamp in milliseconds (optional, defaults to now)
 * @returns {string} Formatted timestamp string (ISO 8601)
 */
const getFormattedTimestamp = (timestamp = Date.now()) => {
    return new Date(timestamp).toISOString();
};

module.exports = {
    logWithTime,
    getCurrentTimeInMillis,
    getTwoHoursAgoInMillis,
    getMinutesAgoInMillis,
    getFormattedTimestamp
};