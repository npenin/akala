import { HttpStatusCode } from "./http.js";

export class ErrorWithStatus extends Error
{
    constructor(public readonly statusCode: HttpStatusCode | number, message?: string)
    {
        super(message);
    }
}

export default ErrorWithStatus;