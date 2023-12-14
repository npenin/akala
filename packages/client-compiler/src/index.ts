export interface LoaderContext
{
    conditions: string[];
    format?: string;
    importAttributes: Record<string, unknown>
}

export interface LoaderResult
{
    format: string;
    shortCircuit?: boolean;
    source: string | ArrayBuffer | Uint8Array;
}

export type Loader = (url: string, context: LoaderContext, nextLoad: (url: string, context?: LoaderContext) => Promise<LoaderResult> | LoaderResult) => Promise<LoaderResult> | LoaderResult

export interface ResolverContext
{
    conditions: string[];
    parentURL?: string;
    importAttributes: Record<string, unknown>
}

export interface ResolverResult
{
    format?: string;
    importAttributes?: Record<string, unknown>;
    shortCircuit?: boolean;
    url: string;
}

export type Resolver = (url: string, context: ResolverContext, nextLoad: (url: string, context?: ResolverContext) => Promise<ResolverResult> | ResolverResult) => Promise<ResolverResult> | ResolverResult