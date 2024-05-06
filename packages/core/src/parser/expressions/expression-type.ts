export enum ExpressionType
{
    BinaryExpression = 'binary',
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
    Unknown = 'unknown',
    Format = 'format',
}