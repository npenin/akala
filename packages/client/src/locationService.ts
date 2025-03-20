import { Event, EventEmitter } from '@akala/core';


/**
 * Previous context, for capturing page exit events.
 */

// let prevContext;
/**
 * Perform initial dispatch.
 */

let dispatch = true;


/**
 * Decode URL components (query string, pathname, hash).
 * Accommodates both regular percent encoding and x-www-form-urlencoded format.
 */
// let decodeURLComponents = true;

/**
 * Base path.
 */

const base = '';

/**
 * Running flag.
 */

let running: boolean;

/**
 * HashBang option
 */

let hashbang = false;
/**
 * Detect click event type based on touch support
 */
const clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';

export interface StartOption
{
    dispatch?: boolean;
    decodeURLComponents?: boolean;
    popstate?: boolean;
    click?: boolean;
    hashbang?: boolean;
}

export class LocationService extends EventEmitter<{
    changing: Event<[path: string]>;
    change: Event<[path: string, state?: any]>;
}>
{
    private loaded = false;
    private onpopstateBound = this.onpopstate.bind(this);
    private onclickBound = this.onclick.bind(this);

    /**
     * Initializes the LocationService, binding necessary event listeners and checking document readiness.
     */
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
        } else
        {
            window.addEventListener('load', () =>
            {
                this.loaded = true;
            });
        }
    }

    /**
     * Event handler for click/touch events to intercept navigation and handle route changes.
     * @param {MouseEvent | TouchEvent} e - The click/touch event object
     */
    private onclick(e: MouseEvent | TouchEvent)
    {
        if (1 !== this.which(e)) return;

        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        if (e.defaultPrevented) return;

        let el = (e as any).path ? (e as any).path[0] : e.target as Node;
        while (el && el.nodeName !== 'A') el = el.parentNode;
        if (!el || el.nodeName !== 'A') return;

        const aElement = el as HTMLAnchorElement;

        if (aElement.hasAttribute('download') || aElement.getAttribute('rel') === 'external') return;

        const link = aElement.getAttribute('href');
        if (!hashbang && aElement.pathname === location.pathname && (aElement.hash || '#' === link)) return;

        if (link && link.includes('mailto:')) return;
        if (aElement.target) return;

        if (!this.sameOrigin(aElement.href)) return;

        let path = aElement.pathname + aElement.search + (aElement.hash || '');

        if (typeof process !== 'undefined' && path.match(/^\/[a-zA-Z]:\//))
        {
            path = path.replace(/^\/[a-zA-Z]:\//, '/');
        }

        const orig = path;

        if (path.startsWith(base))
        {
            path = path.slice(base.length);
        }

        if (hashbang) path = path.replace('#!', '');

        if (base && orig === path) return;

        e.preventDefault();
        this.show(orig);
    }

    /**
     * Determines the mouse button pressed in the event.
     * @param {MouseEvent | TouchEvent} e - The event object
     * @returns {number} Mouse button code (1 for left click)
     */
    private which(e: MouseEvent | TouchEvent): number
    {
        if (e instanceof MouseEvent)
        {
            return (e as MouseEvent).which || e.button;
        } else
        {
            return 1;
        }
    }

    /**
     * Checks if the URL is from the same origin as the current page.
     * @param {string} href - The URL to check
     * @returns {boolean} True if same origin
     */
    private sameOrigin(href: string): boolean
    {
        const origin = `${location.protocol}//${location.hostname}${location.port ? `:${location.port}` : ''}`;
        return href.startsWith(origin);
    }

    /**
     * Handles popstate events for browser history changes.
     * @param {PopStateEvent} e - The popstate event
     */
    private onpopstate(e: PopStateEvent)
    {
        if (!this.loaded) return;
        if (e.state)
        {
            const path = e.state.path;
            this.replace(path, e.state);
        } else
        {
            this.show(location.pathname + location.hash, undefined, undefined, false);
        }
    }

    /**
     * Starts the location service with configuration options.
     * @param {StartOption} options - Service configuration
     */
    public start(options: StartOption)
    {
        options = options || {};
        if (running) return;
        running = true;
        if (options.dispatch === false) dispatch = false;
        if (options.hashbang === true) hashbang = true;

        if (options.popstate !== false)
        {
            window.addEventListener('popstate', this.onpopstateBound, false);
        }
        if (options.click !== false)
        {
            document.addEventListener(clickEvent, this.onclickBound as EventListener, false);
        }

        if (!dispatch) return;

        const url = hashbang && location.hash.includes('#/')
            ? location.hash.slice(2) + location.search
            : location.pathname + location.search + location.hash;
        this.replace(url, null, true, dispatch);
    }

    /**
     * Pushes a new state into the browser's history.
     * @param {string} path - Path to navigate to
     */
    public set(path: string)
    {
        if (hashbang && path[0] !== '#')
        {
            location.assign('#' + path);
        } else
        {
            history.pushState(null, document.title, path);
        }
    }

    /**
     * Refreshes the current route while preserving state.
     */
    public refresh()
    {
        if (running)
            this.dispatch(this.current, false);
    }

    /**
     * Replaces the current URL path in browser history.
     * @param {string} path - New path
     * @param {unknown} [state] - Optional state object
     * @param {boolean} [init] - Initialization flag
     * @param {boolean} [dispatch] - Dispatch flag
     * @returns {string} Current path
     */
    public replace(path: string, state?: unknown, init?: boolean, dispatch?: boolean): string
    {
        this.current = path;
        if (dispatch !== false)
            this.dispatch(path, false);
        return path;
    }

    /**
     * Current path being processed.
     */
    public current = '';

    /**
     * Number of pages navigated.
     */
    public len = 0;

    /**
     * Stops the service and unbinds event listeners.
     */
    public stop()
    {
        if (!running) return;
        this.current = '';
        this.len = 0;
        running = false;
        document.removeEventListener(clickEvent, this.onclickBound, false);
        window.removeEventListener('popstate', this.onpopstateBound, false);
    }

    /**
     * Navigates to a new path with optional state.
     * @param {string} path - Path to navigate to
     * @param {unknown} [state] - Optional state object
     * @param {boolean} [dispatch] - Trigger events flag
     * @param {boolean} [push=true] - Push to history flag
     * @returns {unknown} State object
     */
    public show(path: string, state?: unknown, dispatch?: boolean, push: boolean = true): unknown
    {
        this.current = path;
        if (!dispatch) this.dispatch(path, push);
        return state;
    }

    /**
     * Navigates back in history with fallback path.
     * @param {string} [path] - Fallback path if history is empty
     * @param {unknown} [state] - State for fallback navigation
     */
    public back(path?: string, state?: unknown)
    {
        if (this.len > 0)
        {
            history.back();
            this.len--;
        } else if (path)
        {
            setTimeout(() => this.show(path, state));
        } else
        {
            setTimeout(() => this.show(base, state));
        }
    }

    /**
     * Dispatches route change events and updates browser state.
     * @param {string} path - New path
     * @param {any} [state] - Optional state object
     */
    public dispatch(path: string, state?: any)
    {
        if (running)
            this.emit('changing', path);
        history.pushState(state || null, '', path);
        if (running)
            this.emit('change', path, state);
    }
}
