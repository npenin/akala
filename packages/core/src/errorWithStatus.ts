export default class ErrorWithStatus extends Error
{
    constructor(public readonly statusCode: number, message?: string)
    {
        super(message);
    }
}
