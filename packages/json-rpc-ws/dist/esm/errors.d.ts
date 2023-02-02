export declare class Errors {
    parseError: Error;
    invalidRequest: Error;
    methodNotFound: Error;
    invalidParams: Error;
    internalError: Error;
    serverError: Error;
}
export type ErrorTypes = keyof Errors;
export interface Error {
    code: number;
    message: string;
    data?: unknown;
    stack?: undefined;
}
export interface Payload {
    error: Error;
    id?: string | number;
}
/**
 * Returns a valid jsonrpc2.0 error reply
 *
 * @param {String} type - type of error
 * @param {Number|String|null} id - optional id for reply message
 * @param {Any} data - optional data attribute for error message
 * @returns {Object|null} mreply object that can be sent back
 */
export default function getError(type: ErrorTypes, id?: number | string, data?: unknown): Payload;
