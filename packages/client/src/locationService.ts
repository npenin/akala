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
    private loaded = false;
    private onpopstateBound = this.onpopstate.bind(this);
    private onclickBound = this.onclick.bind(this);

    constructor()
    {
        super();
        if ('undefined' === typeof window)
        {
            return;
        }

        if (document.readyState === 'complete')
        {
            this.loaded = true;
        }
        else
        {
            var self = this;
            window.addEventListener('load', function ()
            {
                setImmediate(function ()
                {
                    self.loaded = true;
                });
            });
        }
    }

    private onclick(e)
    {

        if (1 !== this.which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;



        // ensure link
        // use shadow dom when available
        var el = e.path ? e.path[0] : e.target;
        while (el && 'A' !== el.nodeName) el = el.parentNode;
        if (!el || 'A' !== el.nodeName) return;



        // Ignore if tag has
        // 1. "download" attribute
        // 2. rel="external" attribute
        if (el.hasAttribute('download') || el.getAttribute('rel') === 'external') return;

        // ensure non-hash for the same path
        var link = el.getAttribute('href');
        if (!hashbang && el.pathname === location.pathname && (el.hash || '#' === link)) return;



        // Check for mailto: in the href
        if (link && link.indexOf('mailto:') > -1) return;

        // check target
        if (el.target) return;

        // x-origin
        if (!this.sameOrigin(el.href)) return;



        // rebuild path
        var path = el.pathname + el.search + (el.hash || '');

        // strip leading "/[drive letter]:" on NW.js on Windows
        if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//))
        {
            path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        // same page
        var orig = path;

        if (path.indexOf(base) === 0)
        {
            path = path.substr(base.length);
        }

        if (hashbang) path = path.replace('#!', '');

        if (base && orig === path) return;

        e.preventDefault();
        this.show(orig);
    }

    /**
     * Event button.
     */

    private which(e)
    {
        e = e || window.event;
        return null === e.which ? e.button : e.which;
    }

    /**
     * Check if `href` is the same origin.
     */

    private sameOrigin(href)
    {
        var origin = location.protocol + '//' + location.hostname;
        if (location.port) origin += ':' + location.port;
        return (href && (0 === href.indexOf(origin)));
    }



    private onpopstate(e)
    {
        if (!this.loaded) return;
        if (e.state)
        {
            var path = e.state.path;
            this.replace(path, e.state);
        } else
        {
            this.show(location.pathname + location.hash, undefined, undefined, false);
        }
    };

    public start(options: StartOption)
    {
        options = options || {};
        if (running)
            return;
        running = true;
        if (false === options.dispatch)
            dispatch = false;
        if (false === options.decodeURLComponents)
            decodeURLComponents = false;
        if (false !== options.popstate)
            window.addEventListener('popstate', this.onpopstateBound, false);
        if (false !== options.click)
            document.addEventListener(clickEvent, this.onclickBound, false);
        if (true === options.hashbang)
            hashbang = true;
        if (!dispatch)
            return;
        var url = (hashbang && ~location.hash.indexOf('#/')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
        this.replace(url, null, true, dispatch);
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
            this.dispatch(path, false);
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
        document.removeEventListener(clickEvent, this.onclickBound, false);
        window.removeEventListener('popstate', this.onpopstateBound, false);
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

    public show(path: string, state?: any, dispatch?: boolean, push: boolean = true)
    {
        this.current = path;
        if (!dispatch)
            this.dispatch(path, push);
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

    public dispatch(path: string, push?: boolean)
    {
        this.emit('changing', path)
        if (push)
            history.pushState(null, '', path);
        this.emit('change', path)
    }
}