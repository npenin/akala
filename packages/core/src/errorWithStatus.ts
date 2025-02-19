import { HttpStatusCode } from "./http.js";

export class ErrorWithStatus extends Error
{
    constructor(public readonly statusCode: HttpStatusCode | number, message?: string)
    {
        super(message || getMessageFromStatusCode(statusCode));
    }
}

export default ErrorWithStatus;

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
