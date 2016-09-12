export class Parser
{
    public static parse(expression: string)
    {
        return expression.split('.');
    }

    public static eval(expression: string, value: any)
    {
        var parts = Parser.parse(expression);
        for (var i = 0; i < parts.length; i++)
        {
            value = value[parts[i]];
        }
        return value;
    }
}