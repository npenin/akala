import { sign } from "./signature";

export type Policy = { [service: string]: ServicePolicy };
export type ServicePolicy = { [resource: string]: readonly string[] }

export type Action<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
export type Resource<TActions extends string> = { [action in TActions]: Action<unknown, unknown> }
export type Service = { [resource in string]: Resource<string> }

export function requirePermissions<const T extends Policy>(permissions: T, accessKey: string): Record<string, Service>
{
    return Object.fromEntries(Object.entries(permissions).map(e => [e[0],
    Object.fromEntries(Object.entries(e[1]).map(e => [e[0],
    Object.fromEntries(e[1].map(x => [x,]))
    ]))
    ])) as Record<string, Service>;
}