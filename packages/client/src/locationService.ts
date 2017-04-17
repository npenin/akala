import { EventEmitter } from 'events';
import { WatchBinding } from '@akala/core';


/**
 * Previous context, for capturing
 * page exit events.
 */

var prevContext;
/**
 * Perform initial dispatch.
 */

var dispatch = true;


/**
 * Decode URL components (query string, pathname, hash).
 * Accommodates both regular percent encoding and x-www-form-urlencoded format.
 */
var decodeURLComponents = true;

/**
 * Base path.
 */

var base = '';

/**
 * Running flag.
 */

var running: boolean;

/**
 * HashBang option
 */

var hashbang = false;
/**
 * Detect click event
 */
var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

export interface StartOption
{
    dispatch?: boolean;
    decodeURLComponents?: boolean;
    popstate?: boolean;
    click?: boolean;
    hashbang?: boolean;
}

export class LocationService extends EventEmitter
{
    constructor()
    {
        super();
    }

    public start(options: StartOption)
    {
        options = options || {};
        if (running) return;
        running = true;
        if (false === options.dispatch) dispatch = false;
        if (false === options.decodeURLComponents) decodeURLComponents = false;
        if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
        if (false !== options.click)
        {
            document.addEventListener(clickEvent, onclick, false);
        }
        if (true === options.hashbang) hashbang = true;
        if (!dispatch) return;
        var url = (hashbang && ~location.hash.indexOf('#/')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
        this.replace(url, null, true, dispatch);
        new WatchBinding('href', location, 100).onChanged(this.show.bind(this));
    };

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
    public set(path: string)
    {
        if (hashbang && path[0] != '#')
            location.assign('#' + path);
        else
            location.assign(path);
    }

    public replace(path: string, state?: any, init?: boolean, dispatch?: boolean)
    {
        // var ctx = new Context(path, state);
        this.current = path;
        // ctx.init = init;
        // ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch)
            this.dispatch(path);
        return path;
    };

    /**
     * Current path being processed
     * @type {string}
     */
    public current = '';

    /**
     * Number of pages navigated to.
     * @type {number}
     *
     *     page.len == 0;
     *     page('/login');
     *     page.len == 1;
     */

    public len = 0;

    /**
     * Unbind click and popstate event handlers.
     *
     * @api public
     */

    public stop()
    {
        if (!running) return;
        this.current = '';
        this.len = 0;
        running = false;
        document.removeEventListener(clickEvent, onclick, false);
        window.removeEventListener('popstate', onpopstate, false);
    };

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

    public show(path: string, state?: any, dispatch?: boolean)
    {
        this.current = path;
        if (!dispatch)
            this.dispatch(path);
        // if (false !== ctx.handled && false !== push) ctx.pushState();
        return state;
    };

    /**
     * Goes back in the history
     * Back should always let the current route push state and then go back.
     *
     * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
     * @param {Object=} state
     * @api public
     */

    public back(path: string, state: any)
    {
        if (this.len > 0)
        {
            // this may need more testing to see if all browsers
            // wait for the next tick to go back in history
            history.back();
            this.len--;
        } else if (path)
        {
            setTimeout(function ()
            {
                this.show(path, state);
            });
        } else
        {
            setTimeout(function ()
            {
                this.show(base, state);
            });
        }
    };

    public dispatch(path: string)
    {
        this.emit('changing', path)
        this.emit('change', path)
    }
}