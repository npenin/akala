import { HttpStatusCode } from "./http.js";

/** 
 * Error class that includes a status code.
 * @class
 * @property {number} statusCode - The status code associated with the error.
 */
export class ErrorWithStatus extends Error
{
    /** 
     * Creates an instance of ErrorWithStatus.
     * @param {HttpStatusCode | number} statusCode - The HTTP status code.
     * @param {string} [message] - Optional error message. If omitted, a default message is generated based on the statusCode.
     */
    constructor(public readonly statusCode: HttpStatusCode | number, message?: string)
    {
        super(message || getMessageFromStatusCode(statusCode));
    }
}

export default ErrorWithStatus;

/** 
 * Generates a default error message based on the provided HTTP status code.
 * @param {HttpStatusCode} statusCode - The HTTP status code.
 * @returns {string} - The default error message.
 */
export function getMessageFromStatusCode(statusCode: HttpStatusCode): string
{
    switch (statusCode)
    {
        case HttpStatusCode.BadRequest:
        case HttpStatusCode.MethodNotAllowed:
            return 'Invalid operation';
        case HttpStatusCode.Unauthorized:
            return 'Unauthorized access'
        case HttpStatusCode.Forbidden:
            return 'Forbidden'
        case HttpStatusCode.NotFound:
            return 'Not found';
        case HttpStatusCode.NotAcceptable:
            return 'Not acceptable';
        case HttpStatusCode.RequestTimeout:
            return 'Timeout';
        case HttpStatusCode.Conflict:
        case HttpStatusCode.Locked:
        case HttpStatusCode.InternalServerError:
        case HttpStatusCode.NotImplemented:
        case HttpStatusCode.ServiceUnavailable:
        case HttpStatusCode.InsufficientStorage:
            return HttpStatusCode[statusCode];
    }
}
