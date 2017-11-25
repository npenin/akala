export interface HttpOptions
{
    method?: string;
    url: string;
    params?: any;
    body?: any;
    headers?: { [key: string]: string | number | Date };
    contentType?: 'json' | 'form';
    type?: 'json' | 'xml';
}

export interface Http<TResponse=any>
{
    get<T=string>(url: string, params?: any): PromiseLike<T>;
    post<T=string>(url: string, body?: any): PromiseLike<T>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    call<T=string>(method: string, url: string, params?: any): PromiseLike<{ response: TResponse, body: T }>;
    call<T=string>(options: HttpOptions): PromiseLike<{ response: TResponse, body: T }>;
}