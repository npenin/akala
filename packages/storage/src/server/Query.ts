import { TypedLambdaExpression, LambdaExpression, BinaryOperator } from '@akala/core/expressions';
import { Expression, TypedExpression, Predicate, Expressions, Project, Project2, StrictExpressions } from '@akala/core/expressions';
import { ApplySymbolExpression } from '@akala/core/expressions';
import { ConstantExpression } from '@akala/core/expressions';
import { ModelDefinition } from './shared';
import { ParameterExpression } from '@akala/core/expressions';
import { MemberExpression } from '@akala/core/expressions';
import { NewExpression } from '@akala/core/expressions';
import { BinaryExpression } from '@akala/core/expressions';
import * as akala from '@akala/core'
import { Parser } from './parser';

export type asyncProxy<T> = { [P in keyof T]: PromiseLike<T[P]> };

export class Query<T> implements AsyncIterable<T>
{
    constructor(provider: IQueryableProvider, expression?: TypedExpression<T>)
    constructor(provider: IQueryableProvider, expression?: ConstantExpression<ModelDefinition<T>>)
    constructor(public readonly provider: IQueryableProvider, public readonly expression?: TypedExpression<T>)
    {
    }

    async *[Symbol.asyncIterator]()
    {
        var data = await this.provider.execute<T[]>(this.expression);
        for await (var r of data)
            yield r;
    }

    public async firstOrDefault(): Promise<T>
    {
        var result = await this[Symbol.asyncIterator]().next();
        return result.value as T;
    }

    public async singleOrDefault(): Promise<T>
    {
        var iterator = this[Symbol.asyncIterator]();
        var result = await iterator.next();
        if (!result.done && !(await iterator.next()).done)
            throw new Error('More than one item was found');
        return result.value as T;
    }

    public async toArray(): Promise<T[]>
    {
        var result = [];
        for await (const item of this)
        {
            result.push(item);
        }
        return result;
    }

    public where<F extends keyof T>(field: F, operator: BinaryOperator, value: T[F]): Query<T>
    public where(expression: string): Query<T>
    public where(expression: TypedLambdaExpression<Predicate<T>>): Query<T>
    public where(field: string, operator: akala.expressions.BinaryOperator, value: unknown): Query<T>
    public where<F extends keyof T>(fieldOrExpression: F | TypedLambdaExpression<Predicate<T>>, operator?: akala.expressions.BinaryOperator, value?: T[F]): Query<T>
    {
        if (typeof fieldOrExpression == 'string')
        {
            var parameter = new ParameterExpression<T>();
            var parser = new Parser(parameter);
            var exp = parser.parse(fieldOrExpression);
            if (typeof value != 'undefined')
                return this.where(new TypedLambdaExpression<Predicate<T>>(new BinaryExpression<StrictExpressions>(exp, operator, new ConstantExpression(value)), [parameter]));
            return this.where(new TypedLambdaExpression<Predicate<T>>(exp, [parameter]));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
            throw new Error('Invalid type of field');
        return new Query<T>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.where, fieldOrExpression as TypedLambdaExpression<Predicate<T>>));
    }

    public orderBy<F extends keyof T>(field: F): Query<T>
    public orderBy<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<T>
    public orderBy<X>(fieldOrExpression: X | TypedLambdaExpression<Project<T, X>>): Query<T>
    {
        if (typeof fieldOrExpression == 'string')
        {
            var parameter = new ParameterExpression<T>()
            return this.orderBy(new TypedLambdaExpression<Project<T, X>>(new MemberExpression(parameter, fieldOrExpression as unknown as keyof T), [parameter]));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
            throw new Error('Invalid type of field');
        return new Query<T>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.orderby, fieldOrExpression as TypedLambdaExpression<Project<T, X>>));
    }

    public orderByDescending<F extends keyof T>(field: F): Query<T>
    public orderByDescending<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<T>
    public orderByDescending<X>(fieldOrExpression: X | TypedLambdaExpression<Project<T, X>>): Query<T>
    {
        if (typeof fieldOrExpression == 'string')
        {
            var parameter = new ParameterExpression<T>()
            return this.orderByDescending(new TypedLambdaExpression<Project<T, X>>(new MemberExpression(parameter, fieldOrExpression as unknown as keyof T), [parameter]));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
            throw new Error('Invalid type of field');
        return new Query<T>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.orderbyDesc, fieldOrExpression as TypedLambdaExpression<Project<T, X>>));
    }

    public groupBy<F extends keyof T>(field: F): Query<{ key: T, value: Query<T> }>
    public groupBy<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<{ key: unknown, value: Query<U> }>
    public groupBy<X>(fieldOrExpression: (X extends keyof T ? X : never) | TypedLambdaExpression<Project<T, X>>)
    {
        if (typeof fieldOrExpression == 'string' || typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
        {
            var parameter = new ParameterExpression<T>()
            return this.groupBy(LambdaExpression.typed<Project<T, X>, X>(new MemberExpression(parameter, fieldOrExpression), [parameter]));
        }
        return new Query(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.groupby, fieldOrExpression as TypedLambdaExpression<Project<T, X>>));
    }

    public join<U, X>(other: Query<U>, fieldT: keyof T, fieldU: keyof U, selector: { first: keyof X, second: keyof X }): Query<X>
    {
        // if (typeof fieldOrExpression == 'string')
        // {
        var parameterT = new ParameterExpression<T>()
        var parameterU = new ParameterExpression<U>()
        var joinCondition = new TypedLambdaExpression<Project2<T, U, X>>(
            new BinaryExpression<Expressions>(
                new NewExpression<X>(
                    new MemberExpression<X, typeof selector.first, X[typeof selector.first]>(new MemberExpression(parameterT, fieldT), selector.first),
                    new MemberExpression<X, typeof selector.second, X[typeof selector.second]>(new MemberExpression(parameterU, fieldU), selector.second)),
                akala.expressions.BinaryOperator.Unknown, other.expression),
            [parameterT, parameterU]);
        // }
        // if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
        //     throw new Error('Invalid type of field');
        return new Query<X>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.join, joinCondition as TypedLambdaExpression<Project<T, X>>));
    }

    public select<F extends keyof T>(field: F): Query<T[F]>
    public select<U>(map: { [K in keyof U]: string }): Query<U>
    public select<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<U>
    public select<U>(fieldOrExpression: keyof T | { [K in keyof U]: string } | TypedLambdaExpression<Project<T, U>>)
    {
        if (typeof fieldOrExpression == 'string')
        {
            const parameter = new ParameterExpression<T>()
            return this.select(LambdaExpression.typed<Project<T, U>, U>(new MemberExpression(parameter, fieldOrExpression), [parameter]));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number' || typeof fieldOrExpression == 'string')
            throw new Error('Invalid type of field');

        if (!(fieldOrExpression instanceof TypedLambdaExpression))
        {
            const map = fieldOrExpression as { [K in keyof U]: string };
            const parameter = new ParameterExpression<T>()
            var parser = new Parser(parameter);
            return this.select(LambdaExpression.typed<Project<T, U>, U>(new NewExpression<U>(...akala.map(map, (keySource, keyTarget) =>
            {
                var source = parser.parse(keySource)
                // var source = akala.Parser.parseBindable(keySource).reduce<TypedExpression<any>>((previous, current) => new MemberExpression<any, string, any>(previous, current as unknown as string), parameter);
                return new MemberExpression<U, keyof U, U[keyof U]>(source as TypedExpression<U>, keyTarget)
            }, true)), [parameter]));
        }
        return new Query<U>(this.provider, new ApplySymbolExpression<T, U>(this.expression, QuerySymbols.select, fieldOrExpression as TypedLambdaExpression<Project<T, U>>));
    }

    public any(expression?: TypedLambdaExpression<Predicate<T>>): PromiseLike<boolean>
    {
        if (expression)
            return this.where(expression).any();
        return this.provider.execute<boolean>(new ApplySymbolExpression<T, T>(this.expression, QuerySymbols.any)).then(values => values[0]);
    }

    public async length(expression?: TypedLambdaExpression<Predicate<T>>): Promise<number>
    {
        if (expression)
            return this.where(expression).length();
        var values = await this.provider.execute<number>(new ApplySymbolExpression<T, T>(this.expression, QuerySymbols.count));
        return values;
    }
}

export interface IQueryable
{
    readonly provider: IQueryableProvider;
    readonly expression: Expression;
}

export interface IQueryableProvider
{
    execute<TResult>(expression: Expressions): PromiseLike<TResult>;
}

export var QuerySymbols = {
    where: Symbol('where'),
    any: Symbol('any'),
    select: Symbol('select'),
    orderby: Symbol('orderby'),
    orderbyDesc: Symbol('orderbyDesc'),
    groupby: Symbol('groupby'),
    join: Symbol('join'),
    count: Symbol('count'),
}

