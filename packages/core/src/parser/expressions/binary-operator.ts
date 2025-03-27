/**
 * Enum representing binary operators.
 */
export enum BinaryOperator
{
    Equal = '==',
    StrictEqual = '===',
    NotEqual = '!=',
    StrictNotEqual = '!==',
    LessThan = '<',
    LessThanOrEqual = '<=',
    GreaterThan = '>',
    GreaterThanOrEqual = '>=',
    And = '&&',
    Or = '||',
    Minus = '-',
    Plus = '+',
    Modulo = '%',
    Div = '/',
    Times = '*',
    Pow = '^',
    Dot = '.',
    QuestionDot = '?.',
    Format = '#',
    Unknown = 'x'
}

Object.entries(BinaryOperator).forEach(e => BinaryOperator[e[1]] = e[0]);
