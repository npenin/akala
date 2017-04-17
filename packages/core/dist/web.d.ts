export interface Http {
    get(url: string, params?: any): PromiseLike<string>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    call(method: string, url: string, params?: any): PromiseLike<string>;
}
