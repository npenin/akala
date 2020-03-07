export class InteractError extends Error
{
    public readonly code = 'INTERACT';

    constructor(message: string, public as?: string)
    {
        super(message);
    }

    public toJSON()
    {
        return { code: this.code, message: this.message, as: this.as };
    }
}

export default function interact(message: string, as?: string)
{
    throw new InteractError(message, as);
}