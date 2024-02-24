import { distinctStrings } from '@akala/core'

export const actions = {
    DynamoDB_2012010: {
        BatchExecuteStatement: 'BatchExecuteStatement',
        BatchGetItem: 'BatchGetItem',
        BatchWriteItem: 'BatchWriteItem',
        CreateBackup: 'CreateBackup',
        CreateGlobalTable: 'CreateGlobalTable',
        CreateTable: 'CreateTable',
        DeleteBackup: 'DeleteBackup',
        DeleteItem: 'DeleteItem',
        DeleteTable: 'DeleteTable',
        DescribeBackup: 'DescribeBackup',
        DescribeContinuousBackups: 'DescribeContinuousBackups',
        DescribeContributorInsights: 'DescribeContributorInsights',
        DescribeEndpoints: 'DescribeEndpoints',
        DescribeExport: 'DescribeExport',
        DescribeGlobalTable: 'DescribeGlobalTable',
        DescribeGlobalTableSettings: 'DescribeGlobalTableSettings',
        DescribeImport: 'DescribeImport',
        DescribeKinesisStreamingDestination: 'DescribeKinesisStreamingDestination',
        DescribeLimits: 'DescribeLimits',
        DescribeTable: 'DescribeTable',
        DescribeTableReplicaAutoScaling: 'DescribeTableReplicaAutoScaling',
        DescribeTimeToLive: 'DescribeTimeToLive',
        DisableKinesisStreamingDestination: 'DisableKinesisStreamingDestination',
        EnableKinesisStreamingDestination: 'EnableKinesisStreamingDestination',
        ExecuteStatement: 'ExecuteStatement',
        ExecuteTransaction: 'ExecuteTransaction',
        ExportTableToPointInTime: 'ExportTableToPointInTime',
        GetItem: 'GetItem',
        ImportTable: 'ImportTable',
        ListBackups: 'ListBackups',
        ListContributorInsights: 'ListContributorInsights',
        ListExports: 'ListExports',
        ListGlobalTables: 'ListGlobalTables',
        ListImports: 'ListImports',
        ListTables: 'ListTables',
        ListTagsOfResource: 'ListTagsOfResource',
        PutItem: 'PutItem',
        Query: 'Query',
        RestoreTableFromBackup: 'RestoreTableFromBackup',
        RestoreTableToPointInTime: 'RestoreTableToPointInTime',
        Scan: 'Scan',
        TagResource: 'TagResource',
        TransactGetItems: 'TransactGetItems',
        TransactWriteItems: 'TransactWriteItems',
        UntagResource: 'UntagResource',
        UpdateContinuousBackups: 'UpdateContinuousBackups',
        UpdateContributorInsights: 'UpdateContributorInsights',
        UpdateGlobalTable: 'UpdateGlobalTable',
        UpdateGlobalTableSettings: 'UpdateGlobalTableSettings',
        UpdateItem: 'UpdateItem',
        UpdateKinesisStreamingDestination: 'UpdateKinesisStreamingDestination',
        UpdateTable: 'UpdateTable',
        UpdateTableReplicaAutoScaling: 'UpdateTableReplicaAutoScaling',
        UpdateTimeToLive: 'UpdateTimeToLive',
    }
};

export class DynamoDb
{
    constructor(public readonly prefix: string, private region: string, private credentials?: { AccessKey: string })
    {

    }
}

export function marshall<T>(value: T, options?: { removeUndefinedValues: boolean }): Marshall<T>
{
    switch (typeof value)
    {
        case "string":
            return { S: value } as unknown as Marshall<T>;
        case "number":
            return { N: value } as unknown as Marshall<T>;
        case "bigint":
            return { S: value.toString() } as unknown as Marshall<T>;
        case "boolean":
            return { B: value.toString() } as unknown as Marshall<T>;
        case "undefined":
            if (!options?.removeUndefinedValues)
                throw new Error('use removeUndefinedValues to remove undefined values');
            return;
        case "object":
            if (Array.isArray(value))
            {
                const types = distinctStrings(value.map(x => typeof x));
                if (types.length == 1)
                {
                    switch (types[0])
                    {
                        case 'string':
                            return { SS: value } as unknown as Marshall<T>;
                        case 'number':
                            return { NS: value } as unknown as Marshall<T>;
                        case 'bigint':
                            return { SS: value.map(v => v.toString()) } as unknown as Marshall<T>;
                        case 'boolean':
                        case 'symbol':
                        case 'function':
                            throw new Error('Not supported');
                        case 'undefined':
                            if (!options?.removeUndefinedValues)
                                throw new Error('use removeUndefinedValues to remove undefined values');
                            return;
                        case 'object':
                            return { L: value.map(v => marshall(v, options)) } as unknown as Marshall<T>
                    }
                }
            }
            else
            {
                return { M: Object.fromEntries(Object.entries(value).map(e => [e[0], marshall(e[1], options)])) } as unknown as Marshall<T>
            }
        case "function":
            throw new Error('Not supported');
            return;
    }
}

export function unmarshall<T extends object>(value: Marshall<T>, parent?: keyof AttributeValue): T
{
    const result: T = {} as unknown as T;
    if (typeof value !== 'object')
        throw new Error('Invalid value. It should be an object');
    Object.fromEntries(Object.entries(value).map(function unmarshallInternal(e)
    {
        const type = Object.keys(e[1])[0];
        switch (type)
        {
            case 'N':
                return [e[0], Number(e[1][type])];
            case 'S':
            case 'SS':
            case 'B':
            case 'BS':
                return [e[0], Number(e[1][type])];
            case 'NS':
                return [e[0], e[1][type].map((n: string) => Number(n))];
            case 'M':
                return [e[0], unmarshall(e[1][type])];
            case 'L':
                return [e[0], e[1][type].map(unmarshallInternal)];
            case 'NULL':
                return [e[0], null];
            case 'BOOL':
                return [e[0], Boolean(e[1][type])];
            default:
                throw new Error('Unsupported type: ' + type);

        }
    }))
    return result;
}

export class Table<T, THashKey extends keyof T, TRangeKey extends keyof T | undefined = undefined>
{
    constructor(private name: string, private region: string, credentials: { AccessKey: string })
    {

    }

    public get(key: THashKey)
    {
        return fetch('https://dynamodb.' + this.region + '.amazonaws.com', { headers: { 'content-type': 'application/json', 'x-amz-target': actions.DynamoDB_2012010.GetItem }, body: JSON.stringify(marshall(key)) })
    }
}

export type AttributeValue = SMember | NMember | BMember | SSMember | NSMember | BSMember | MMember | LMember | NULLMember | BOOLMember;

export interface SMember
{
    S: string;
}
export interface NMember
{
    N: string;
}
export interface BMember
{
    B: Uint8Array;
}
export interface SSMember
{
    SS: string[];
}
export interface NSMember
{
    NS: string[];
}
export interface BSMember
{
    BS: Uint8Array[];
}
export interface MMember
{
    M: Record<string, AttributeValue>;
}
export interface LMember
{
    L: AttributeValue[];
}
export interface NULLMember
{
    NULL: null;
}

export interface BOOLMember
{
    BOOL: boolean;
}


export type Marshall<T> = T extends string ? SMember : T extends boolean ? BOOLMember : T extends number ? NMember : T extends Array<infer X> ? X extends string ? SSMember : X extends number ? NSMember : X extends Uint8Array ? BSMember : {
    L: MarshallInner<X>[];
} : T extends Uint8Array ? BMember : T extends null ? NULLMember : T extends object ? {
    [key in keyof T]: T[key] extends Array<any> ? MarshallInner<T[key]> : T[key] extends object ? {
        M: MarshallInner<T[key]>;
    } : MarshallInner<T[key]>;
} : never;
export type MarshallInner<T> = T extends string ? SMember : T extends boolean ? BOOLMember : T extends number ? NMember : T extends Array<infer X> ? X extends string ? SSMember | { L: { S: string }[] } : X extends number ? NSMember : X extends Uint8Array ? BSMember : {
    L: MarshallInner<X>[];
} : T extends Uint8Array ? BMember : T extends null ? NULLMember : T extends object ? {
    M: MarshallInner<T>;
} : never;
export type Unmarshall<T> = T extends SMember ? string : T extends NMember ? number : T extends SSMember ? string[] : T extends NSMember ? number[] : T extends BMember ? Uint8Array : T extends BSMember ? Uint8Array[] : T extends NULLMember ? null : T extends {
    L: Unmarshall<infer X>[];
} ? Unmarshall<X> : T extends {
    M: Unmarshall<infer X>;
} ? Unmarshall<X> : T extends object ? {
    [key in keyof T]: Unmarshall<T[key]>;
} : unknown;

