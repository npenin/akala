/// <reference types="node" />
import { EventEmitter } from 'events';
export interface StartOption {
    dispatch?: boolean;
    decodeURLComponents?: boolean;
    popstate?: boolean;
    click?: boolean;
    hashbang?: boolean;
}
export declare class LocationService extends EventEmitter {
    constructor();
    start(options: StartOption): void;
    /**
 * Replace `path` with optional `state` object.
 *
 * @param {string} path
 * @param {Object=} state
 * @param {boolean=} init
 * @param {boolean=} dispatch
 * @return {!Context}
 * @api public
 */
    set(path: string): void;
    replace(path: string, state?: any, init?: boolean, dispatch?: boolean): string;
    /**
     * Current path being processed
     * @type {string}
     */
    current: string;
    /**
     * Number of pages navigated to.
     * @type {number}
     *
     *     page.len == 0;
     *     page('/login');
     *     page.len == 1;
     */
    len: number;
    /**
     * Unbind click and popstate event handlers.
     *
     * @api public
     */
    stop(): void;
    /**
     * Show `path` with optional `state` object.
     *
     * @param {string} path
     * @param {Object=} state
     * @param {boolean=} dispatch
     * @param {boolean=} push
     * @return {!Context}
     * @api public
     */
    show(path: string, state?: any, dispatch?: boolean): any;
    /**
     * Goes back in the history
     * Back should always let the current route push state and then go back.
     *
     * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
     * @param {Object=} state
     * @api public
     */
    back(path: string, state: any): void;
    dispatch(path: string): void;
}
