/**
 * IP Configuration
 * Defines server IP addresses
 */

module.exports = {
    LOCALHOST: "localhost",
    LOCALHOST_IP: "127.0.0.1",
    SERVER_IP: process.env.SERVER_IP || "localhost"
};