import { ExpressionType } from './expression-type.js';
import type { TypedLambdaExpression } from './lambda-expression.js';
import type { BinaryExpression } from './binary-expression.js';
import type { UnaryExpression } from './unary-expression.js';
import type { MemberExpression } from './member-expression.js';
import type { ConstantExpression } from './constant-expression.js';
import type { ParameterExpression } from './parameter-expression.js';
import type { CallExpression } from './call-expression.js';
import type { ApplySymbolExpression } from './apply-symbol-expression.js';
import type { NewExpression } from './new-expression.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';
import type { IVisitable } from './visitable.js';
import type { FormatExpression } from '../parser.js';
import type { TernaryExpression } from './ternary-expression.js';
import type { AssignmentExpression } from './assignment-expression.js';

export type UnknownExpression = { type: ExpressionType.Unknown, accept(visitor: ExpressionVisitor): Expressions };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StrictTypedExpression<T> =
    ConstantExpression<T> |
    ParameterExpression<T> |
    FormatExpression<T> |
    MemberExpression<any, any, T> |
    ApplySymbolExpression<any, T> |
    NewExpression<T>;
export type TypedExpression<T> = StrictTypedExpression<T>;

export type Predicate<T> = (a: T) => boolean;
export type Project<T, U> = (a: T) => U;
export type Project2<T, U, V> = (a: T, b: U) => V;

export type PredicateAsync<T> = (a: T) => PromiseLike<boolean>;
export type ProjectAsync<T, U> = (a: T) => PromiseLike<U>;
export type Project2Async<T, U, V> = (a: T, b: U) => PromiseLike<V>;

export type IEnumerable<T> = Iterable<T>;

export abstract class Expression
{
    abstract get type(): ExpressionType;
    abstract accept(visitor: ExpressionVisitor): Expressions;

}
/* eslint-disable @typescript-eslint/no-explicit-any */
export type StrictExpressions = (ApplySymbolExpression<any, any> |
    BinaryExpression<any> |
    TernaryExpression<any> |
    FormatExpression<any> |
    CallExpression<any, any> |
    ParameterExpression<any> |
    TypedLambdaExpression<(...args: unknown[]) => unknown> |
    MemberExpression<any, any, any> |
    UnaryExpression |
    ConstantExpression<any> |
    NewExpression<any>) & IVisitable<ExpressionVisitor, StrictExpressions> |
    AssignmentExpression<any>
    ;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type Expressions = StrictExpressions | UnknownExpression | UnaryExpression | BinaryExpression | TernaryExpression;
