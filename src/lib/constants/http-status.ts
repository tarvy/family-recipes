/**
 * HTTP Status Code Constants
 *
 * Standard HTTP status codes used across API routes.
 * Using named constants improves code readability and maintainability.
 */

/** 400 Bad Request - The request was malformed or invalid */
export const HTTP_BAD_REQUEST = 400;

/** 401 Unauthorized - Authentication is required */
export const HTTP_UNAUTHORIZED = 401;

/** 403 Forbidden - The user is authenticated but not authorized */
export const HTTP_FORBIDDEN = 403;

/** 404 Not Found - The requested resource does not exist */
export const HTTP_NOT_FOUND = 404;

/** 409 Conflict - The request conflicts with the current state */
export const HTTP_CONFLICT = 409;

/** 500 Internal Server Error - An unexpected server error occurred */
export const HTTP_INTERNAL_SERVER_ERROR = 500;
