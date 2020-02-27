export class InteractError extends Error
{
    public readonly code = 'INTERACT';

    constructor(message: string, public as?: string)
    {
        super(message);
    }
}

export default function interact(message: string, as?: string)
{
    throw new InteractError(message, as);
}