/**
 * Enum representing different types of expressions.
 */
export enum ExpressionType
{
    BinaryExpression = 'binary',
    TernaryExpression = "ternary",
    IfStatement = 'if',
    ElseStatement = 'else',
    UnaryExpression = 'unary',
    ParameterExpression = 'param',
    ConstantExpression = 'const',
    LambdaExpression = 'lambda',
    MemberExpression = 'member',
    CallExpression = 'call',
    ApplySymbolExpression = 'applySymbol',
    NewExpression = 'new',
    Format = 'format',
    Unknown = 'unknown',
}
