/**
 * Enum representing binary operators.
 */
export enum AssignmentOperator
{
    Equal = '=',
    NullCoaleasce = '??=',
    Unknown = 'x'
}

Object.entries(AssignmentOperator).forEach(e => AssignmentOperator[e[1]] = e[0]);
