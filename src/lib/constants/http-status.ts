/**
 * HTTP Status Code Constants
 *
 * Standard HTTP status codes used across API routes.
 * Using named constants improves code readability and maintainability.
 */

/** 200 OK - The request was successful */
export const HTTP_OK = 200;

/** 201 Created - The request was successful and a new resource was created */
export const HTTP_CREATED = 201;

/** 204 No Content - The request was successful but there is no content to return */
export const HTTP_NO_CONTENT = 204;

/** 302 Found - The resource has been temporarily moved */
export const HTTP_FOUND = 302;

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
