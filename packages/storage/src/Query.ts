import { customResolve, ICustomResolver, ErrorWithStatus, HttpStatusCode, map, ParsedNumber, ParsedString, Parser, Resolvable } from '@akala/core';
import { ModelDefinition } from './shared.js';
import { NewExpression, TypedLambdaExpression, LambdaExpression, BinaryOperator, Expression, TypedExpression, Predicate, Expressions, Project, Project2, StrictExpressions, ApplySymbolExpression, ConstantExpression, ParameterExpression, MemberExpression, BinaryExpression, ExpressionType } from '@akala/core/expressions';

export type asyncProxy<T> = { [P in keyof T]: PromiseLike<T[P]> };

export type QueryObject<T> = { [key in keyof T]: T[key] | QueryOperations<T[key]> }
    | Queries<T>;

export type Queries<T> =
    { $or?: QueryObject<T>[], $and?: QueryObject<T>[] }

export type QueryOperations<T> = { $eq: T }

type Entry<T> = [keyof T, T[keyof T]];

export class Query<T, TRawQuery = unknown> implements AsyncIterable<T>, ICustomResolver
{
    constructor(provider: IQueryableProvider, expression?: TypedExpression<T>)
    constructor(provider: IQueryableProvider, expression?: ConstantExpression<ModelDefinition<T>>)
    constructor(public readonly provider: IQueryableProvider, public readonly expression?: TypedExpression<T>)
    {
    }

    raw?: <U>(query: TRawQuery) => PromiseLike<U>;

    [customResolve]<T>(param: Resolvable): T
    {
        switch (typeof param)
        {
            case 'string':
                if (param.startsWith('$exp.'))
                    return this.provider.execute(Parser.parameterLess.parse(param.substring('$exp.'.length))) as T;
                if (param == '$exp')
                    return {
                        [customResolve](param)
                        {
                            if (typeof param !== 'string')
                                throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'The next value after $exp may only be a string');
                            return this.provider.execute(Parser.parameterLess.parse(param)) as T;
                        }
                    } as T;

            //on purpose fallback to next cases
            case 'number':
            case 'bigint':
            case 'boolean':
                if (this.expression.type == ExpressionType.ConstantExpression)
                {
                    const model = this.expression.value as ModelDefinition<T>;
                    if (model.key.length > 1)
                        throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'The model has multiple keys defined, but only one was provided.');

                    return this.where(model.key[0], BinaryOperator.Equal, param).firstOrDefault() as T;
                }
                break;
            case 'symbol':
            case 'undefined':
            case 'function':
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'The provided param is not resolvable to a key.');
            case 'object':
                if (Array.isArray(param))
                {
                    if (this.expression.type == ExpressionType.ConstantExpression)
                    {
                        const model = this.expression.value as ModelDefinition<T>;
                        if (model.key.length !== param.length)
                            throw new ErrorWithStatus(HttpStatusCode.BadRequest, `The model has multiple (${model.key.length}) keys defined, but only ${param.length} was provided.`);

                        return model.key.reduce((query, key, i) => query.where(key, BinaryOperator.Equal, param[i]), this).firstOrDefault() as T;
                    }
                }
                else
                    return this.byObject(param as any) as T;
        }
    }

    byObject<U>(param: QueryObject<T> | TRawQuery)
    {
        if (this.raw)
            return this.raw<U>(param as TRawQuery);
        const parameter = new ParameterExpression();
        return this.where(new TypedLambdaExpression(this.getOperationFromEntry(param, parameter), parameter));
    }


    async *[Symbol.asyncIterator]()
    {
        const data = await this.provider.execute<AsyncIterable<T>>(this.expression);
        for await (const r of data)
            yield r;
    }

    public async firstOrDefault(): Promise<T>
    {
        const result = await this[Symbol.asyncIterator]().next();
        return result.value as T;
    }

    public async singleOrDefault(): Promise<T>
    {
        const iterator = this[Symbol.asyncIterator]();
        const result = await iterator.next();
        if (!result.done && !(await iterator.next()).done)
            throw new Error('More than one item was found');
        return result.value as T;
    }

    public async toArray(): Promise<T[]>
    {
        const result = [];
        for await (const item of this)
        {
            result.push(item);
        }
        return result;
    }

    public where<F extends keyof T>(field: F, operator: BinaryOperator, value: T[F]): Query<T, TRawQuery>
    public where(expression: string): Query<T, TRawQuery>
    public where(expression: TypedLambdaExpression<Predicate<T>>): Query<T, TRawQuery>
    public where(field: string, operator: BinaryOperator, value: unknown): Query<T, TRawQuery>
    public where<F extends keyof T>(fieldOrExpression: F | TypedLambdaExpression<Predicate<T>>, operator?: BinaryOperator, value?: T[F]): Query<T, TRawQuery>
    {
        // console.log(fieldOrExpression);
        if (typeof fieldOrExpression == 'string')
        {
            const parameter = new ParameterExpression<T>();
            const parser = new Parser(parameter);
            const exp = parser.parse(fieldOrExpression);
            if (typeof value != 'undefined')
                return this.where(new TypedLambdaExpression<Predicate<T>>(new BinaryExpression<StrictExpressions>(exp as StrictExpressions, operator, new ConstantExpression(value)), parameter));
            return this.where(new TypedLambdaExpression<Predicate<T>>(exp, parameter));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
            throw new Error('Invalid type of field');
        return new Query<T, TRawQuery>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.where, fieldOrExpression));
    }

    public orderBy<F extends keyof T>(field: F): Query<T, TRawQuery>
    public orderBy<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<T, TRawQuery>
    public orderBy<X>(fieldOrExpression: X | TypedLambdaExpression<Project<T, X>>): Query<T, TRawQuery>
    {
        if (typeof fieldOrExpression == 'string')
        {
            const parameter = new ParameterExpression<T>()
            return this.orderBy(new TypedLambdaExpression<Project<T, X>>(new MemberExpression(parameter, new ParsedString(fieldOrExpression) as unknown as TypedExpression<keyof T>, true), parameter));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
            throw new Error('Invalid type of field');
        return new Query<T, TRawQuery>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.orderby, fieldOrExpression as TypedLambdaExpression<Project<T, X>>));
    }

    public orderByDescending<F extends keyof T>(field: F): Query<T, TRawQuery>
    public orderByDescending<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<T, TRawQuery>
    public orderByDescending<X>(fieldOrExpression: X | TypedLambdaExpression<Project<T, X>>): Query<T, TRawQuery>
    {
        if (typeof fieldOrExpression == 'string')
        {
            const parameter = new ParameterExpression<T>()
            return this.orderByDescending(new TypedLambdaExpression<Project<T, X>>(new MemberExpression(parameter, new ParsedString(fieldOrExpression) as unknown as TypedExpression<keyof T>, true), parameter));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
            throw new Error('Invalid type of field');
        return new Query<T, TRawQuery>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.orderbyDesc, fieldOrExpression as TypedLambdaExpression<Project<T, X>>));
    }

    public groupBy<F extends keyof T>(field: F): Query<{ key: T, value: Query<T, TRawQuery> }, TRawQuery>
    public groupBy<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<{ key: unknown, value: Query<U, TRawQuery> }, TRawQuery>
    public groupBy(fieldOrExpression: keyof T | TypedLambdaExpression<Project<T, unknown>>)
    {
        if (typeof fieldOrExpression == 'string' || typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
        {
            const parameter = new ParameterExpression<T>()
            return this.groupBy(LambdaExpression.typed(new MemberExpression(parameter, (typeof (fieldOrExpression) == 'string' ? new ParsedString(fieldOrExpression) : new ParsedNumber(fieldOrExpression.toString())) as unknown as TypedExpression<keyof T>, true), [parameter]));
        }
        return new Query(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.groupby, fieldOrExpression));
    }

    public join<U, X>(other: Query<U, TRawQuery>, fieldT: keyof T, fieldU: keyof U, selector: { first: keyof X, second: keyof X }): Query<X, TRawQuery>
    {
        // if (typeof fieldOrExpression == 'string')
        // {
        const parameterT = new ParameterExpression<T>()
        const parameterU = new ParameterExpression<U>()
        const joinCondition = new TypedLambdaExpression<Project2<T, U, X>>(
            new BinaryExpression<Expressions>(
                new NewExpression<X>(
                    new MemberExpression<X, typeof selector.first, X[typeof selector.first]>(new MemberExpression(parameterT, (typeof fieldT == 'string' ? new ParsedString(fieldT) : new ParsedNumber(fieldT.toString())) as unknown as TypedExpression<keyof T>, false) as TypedExpression<X>, (typeof selector.first == 'string' ? new ParsedString(selector.first) : new ParsedNumber(selector.first.toString())) as unknown as TypedExpression<typeof selector.first>, false),
                    new MemberExpression<X, typeof selector.second, X[typeof selector.second]>(new MemberExpression(parameterU, (typeof fieldU == 'string' ? new ParsedString(fieldU) : new ParsedNumber(fieldU.toString())) as unknown as TypedExpression<keyof U>, false) as TypedExpression<X>, (typeof selector.second == 'string' ? new ParsedString(selector.second) : new ParsedNumber(selector.second.toString())) as unknown as TypedExpression<typeof selector.second>, false)),
                BinaryOperator.Unknown, other.expression),
            parameterT, parameterU);
        // }
        // if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number')
        //     throw new Error('Invalid type of field');
        return new Query<X, TRawQuery>(this.provider, new ApplySymbolExpression(this.expression, QuerySymbols.join, joinCondition as TypedLambdaExpression<Project<T, X>>));
    }

    public select<F extends keyof T>(field: F): Query<T[F], TRawQuery>
    public select<U>(map: { [K in keyof U]: string }): Query<U, TRawQuery>
    public select<U>(expression: TypedLambdaExpression<Project<T, U>>): Query<U, TRawQuery>
    public select<U>(fieldOrExpression: keyof T | { [K in keyof U]: string } | TypedLambdaExpression<Project<T, U>>)
    {
        if (typeof fieldOrExpression == 'string')
        {
            const parameter = new ParameterExpression<T>()
            return this.select(LambdaExpression.typed<Project<T, U>, U>(new MemberExpression(parameter, new ParsedString(fieldOrExpression) as unknown as TypedExpression<keyof T>, false) as TypedExpression<U>, [parameter]));
        }
        if (typeof fieldOrExpression == 'symbol' || typeof fieldOrExpression == 'number' || typeof fieldOrExpression == 'string')
            throw new Error('Invalid type of field');

        if (!(fieldOrExpression instanceof TypedLambdaExpression))
        {
            const mapObj = fieldOrExpression as { [K in keyof U]: string };
            const parameter = new ParameterExpression<T>()
            const parser = new Parser(parameter);
            return this.select(LambdaExpression.typed<Project<T, U>, U>(new NewExpression<U>(...map(mapObj, (keySource, keyTarget) =>
            {
                const source = parser.parse(keySource)
                // const source = Parser.parseBindable(keySource).reduce<TypedExpression<any>>((previous, current) => new MemberExpression<any, string, any>(previous, current as unknown as string), parameter);
                return new MemberExpression<U, keyof U, U[keyof U]>(source as TypedExpression<U>, typeof keyTarget == 'string' ? new ParsedString(keyTarget) : new ParsedNumber(keyTarget.toString()) as any, false)
            }, true)), [parameter]));
        }
        return new Query<U, TRawQuery>(this.provider, new ApplySymbolExpression<T, U>(this.expression, QuerySymbols.select, fieldOrExpression));
    }

    public any(expression?: TypedLambdaExpression<Predicate<T>>): PromiseLike<boolean>
    {
        if (expression)
            return this.where(expression).any();
        return this.provider.execute<boolean>(new ApplySymbolExpression<T, T>(this.expression, QuerySymbols.any)).then(values => !!values);
    }

    public async length(expression?: TypedLambdaExpression<Predicate<T>>): Promise<number>
    {
        if (expression)
            return this.where(expression).length();
        const values = await this.provider.execute<number>(new ApplySymbolExpression<T, T>(this.expression, QuerySymbols.count));
        return values;
    }


    private getOperationFromEntry(query: QueryObject<T>, parameter: ParameterExpression<T>): Expressions
    {
        return Object.entries(query).reduce((previous, entry: Entry<QueryObject<T> | QueryOperations<T> | Queries<T>>) =>
        {
            let next: Expressions;
            switch (typeof entry[1])
            {
                case 'object':
                    if ('$eq' in entry[1])
                        next = new BinaryExpression<Expressions>(new MemberExpression(parameter, new ConstantExpression(entry[0]), true), BinaryOperator.Equal, new ConstantExpression(entry[1].$eq))
                    else if ('$or' in entry[1])
                        return (entry[1] as Queries<T>).$or.reduce((previous, current) =>
                        {
                            if (previous)
                                return new BinaryExpression<Expressions>(previous, BinaryOperator.Or, this.getOperationFromEntry(current, parameter))
                            this.getOperationFromEntry(current, parameter)
                        }, previous)
                    else if ('$and' in entry[1])
                        return (entry[1] as Queries<T>).$and.reduce((previous, current) =>
                        {
                            if (previous)
                                return new BinaryExpression<Expressions>(previous, BinaryOperator.And, this.getOperationFromEntry(current, parameter))
                            this.getOperationFromEntry(current, parameter)
                        }, previous)
                    break;
                case 'string':
                case 'number':
                case 'bigint':
                case 'boolean':
                case 'undefined':
                    next = new BinaryExpression<Expressions>(new MemberExpression(parameter, new ConstantExpression(entry[0]), true), BinaryOperator.Equal, new ConstantExpression(entry[1]))
                    break;
                default:
                    throw new ErrorWithStatus(400, 'Unsupported value type in query by object');
            }

            if (previous)
                return new BinaryExpression<Expressions>(previous, BinaryOperator.And, next);
            return next;

        }, null as BinaryExpression)
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

export const QuerySymbols = {
    where: Symbol('where'),
    any: Symbol('any'),
    select: Symbol('select'),
    orderby: Symbol('orderby'),
    orderbyDesc: Symbol('orderbyDesc'),
    groupby: Symbol('groupby'),
    join: Symbol('join'),
    count: Symbol('count'),
}
