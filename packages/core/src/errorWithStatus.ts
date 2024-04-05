import { HttpStatusCode } from "./http.js";

export default class ErrorWithStatus extends Error
{
    constructor(public readonly statusCode: HttpStatusCode | number, message?: string)
    {
        super(message);
    }
}
