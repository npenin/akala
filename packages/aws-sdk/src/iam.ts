// import { sign } from "./signature";

export type ServiceConfiguration<TSubResourceKey> = Record<string, ResourceConfiguration<TSubResourceKey>>;
export type ResourceConfiguration<TSubResourceKey> = { prependPrefix: boolean, replaceResource: boolean, subResourceKey?: TSubResourceKey };

export type Policy = { [service: string]: ServicePolicy };
export type ServicePolicy = { [resource: string]: ResourcePolicy }
export type ResourcePolicy = { [action: string]: boolean | Record<string, boolean> }

export type Action<TInput, TOutput> = (input: TInput) => Promise<TOutput>;
export type Resource<TActions extends ResourcePolicy> = { [action in keyof TActions]: TActions[action] extends true ? Action<unknown, unknown> : TActions[action] extends Record<string, boolean> ? { [key in keyof TActions[action]]: Action<unknown, unknown> } : never }
export type Service<T extends ServicePolicy> = { [resource in keyof T]: Resource<T[resource]> }
export type Permissions<T extends Policy> = { [resource in keyof T]: Service<T[resource]> }


// export function permissions<const TResourceKey extends string, const TSubResourceKey extends string>(resourceKey: TResourceKey, config: ServiceConfiguration<TSubResourceKey>)
// {
//     return function <const T extends ServicePolicy>(permissions: T, prefix: string): Service<T>
//     {
//         if (!permissions)
//             return undefined;
//         return Object.assign(Object.fromEntries(Object.entries(permissions).map(([resource, commands]) =>
//         {
//             const resourceConfig = config[resource] || config._default;
//             return [resource as keyof T, Object.fromEntries(Object.keys(commands).map(c => [c, typeof commands[c as keyof typeof commands] == 'boolean' || !resourceConfig.subResourceKey ? async function (input: Omit<Command<GetCommand<AwsServices[TService]['sdk'], typeof c>>['input'], TResourceKey | TSubResourceKey>): Promise<Command<GetCommand<AwsServices[TService]['sdk'], typeof c>>['output']>
//             {
//                 return (client as import("@smithy/smithy-client").Client<any, any, any, any>).send(new (sdk[`${c}Command` as keyof typeof sdk] as any)({
//                     ...input,
//                     [resourceKey]: resourceConfig.prependPrefix ? prefix + resource : resourceConfig.replaceResource ? prefix : resource,
//                 }));
//             } as ActionCommand<AwsServices[TService]['sdk'], typeof c, TResourceKey> : Object.fromEntries(Object.keys(commands[c]).map(subResource => [subResource, async function (input: Omit<Command<GetCommand<AwsServices[TService]['sdk'], typeof c>>['input'], TResourceKey | TSubResourceKey>): Promise<Command<GetCommand<AwsServices[TService]['sdk'], typeof c>>['output']>
//             {
//                 return (client as import("@smithy/smithy-client").Client<any, any, any, any>).send(new (sdk[`${c}Command` as keyof typeof sdk] as any)({
//                     ...input,
//                     [resourceKey]: resourceConfig.prependPrefix ? prefix + resource : resourceConfig.replaceResource ? prefix : resource,
//                     [resourceConfig.subResourceKey]: subResource == '_default' ? undefined : subResource
//                 }));
//             } as ActionCommand<AwsServices[TService]['sdk'], typeof c, TResourceKey | TSubResourceKey>] as const))] as const))];
//         }
//         )), { client }) as ServicePermissions<T, AwsServices[TService]>;
//     }
// }
