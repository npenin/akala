export class Exception extends Error
{
    constructor(message?: string, public innerException?: Exception)
    {
        super(message)
    }
}

export class NotSupportedException extends Exception
{
    constructor(message: string = 'Operation not supported')
    {
        super(message);
    }
}

export class InvalidSyntaxException extends Exception
{
    constructor(message?: string, public innerException?: Exception)
    {
        super(message)
    }
}
