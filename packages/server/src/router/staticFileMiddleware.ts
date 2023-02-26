import { Middleware, MiddlewarePromise } from "@akala/core";
import { Request, Response } from './shared.js'
import { resolve } from 'path'
import send from 'send'
import escapeHtml from 'escape-html';


export interface Options extends send.SendOptions
{
    fallthrough?: boolean;
    redirect?: boolean;
    setHeaders?(): void;
    maxage?: string | number;
}

export class StaticFileMiddleware implements Middleware<[Request, Response]>
{
    private options: Options;
    onDirectory: (res: Request) => void;

    constructor(root?: string, options?: Options)
    {
        this.options = options = Object.create(options || null);

        options.redirect = options.redirect !== false

        // headers listener
        if (options.setHeaders && typeof options.setHeaders !== 'function')
            throw new TypeError('option setHeaders must be function')

        // setup options for send
        options.maxAge = options.maxage || options.maxAge || 0
        if (!options.root)
            options.root = root && resolve(root)

        // construct directory listener
        this.onDirectory = options.redirect
            ? createRedirectDirectoryListener()
            : createNotFoundDirectoryListener()
    }


    handle(req: Request, res: Response): MiddlewarePromise
    {
        if (req.method !== 'GET' && req.method !== 'HEAD')
        {
            if (this.options.fallthrough)
            {
                return Promise.resolve()
            }

            // method not allowed
            res.statusCode = 405
            res.setHeader('Allow', 'GET, HEAD')
            res.setHeader('Content-Length', '0')
            res.end()
            return Promise.reject(res);
        }

        let forwardError = !this.options.fallthrough;

        let path = req.path;

        // make sure redirect occurs at mount
        if (path === '/' && path.substr(-1) !== '/')
        {
            path = ''
        }

        // create send stream
        const stream = send(req, path, this.options)

        // add directory handler
        stream.on('directory', this.onDirectory)

        // add headers listener
        if (this.options.setHeaders)
            stream.on('headers', this.options.setHeaders)

        // add file listener for fallthrough
        if (this.options.fallthrough)
            stream.on('file', function onFile()
            {
                // once file is determined, always forward error
                forwardError = true
            })

        return new Promise((resolve, reject) =>
        {

            // forward errors
            stream.on('error', function error(err)
            {
                if (forwardError || !(err.statusCode < 500))
                {
                    resolve(err)
                    return
                }

                resolve()
            })

            // pipe
            stream.pipe(res).on('close', () => reject(res));
        })
    }
}


/**
 * Collapse all leading slashes into a single slash
 * @private
 */
function collapseLeadingSlashes(str)
{
    // eslint-disable-next-line no-var
    for (var i = 0; i < str.length; i++)
    {
        if (str.charCodeAt(i) !== 0x2f /* / */)
        {
            break
        }
    }

    return i > 1
        ? '/' + str.substr(i)
        : str
}

/**
 * Create a minimal HTML document.
 *
 * @param {string} title
 * @param {string} body
 * @private
 */

function createHtmlDocument(title, body)
{
    return '<!DOCTYPE html>\n' +
        '<html lang="en">\n' +
        '<head>\n' +
        '<meta charset="utf-8">\n' +
        '<title>' + title + '</title>\n' +
        '</head>\n' +
        '<body>\n' +
        '<pre>' + body + '</pre>\n' +
        '</body>\n' +
        '</html>\n'
}

/**
 * Create a directory listener that just 404s.
 * @private
 */

function createNotFoundDirectoryListener()
{
    return function notFound()
    {
        this.error(404)
    }
}

/**
 * Create a directory listener that performs a redirect.
 * @private
 */

function createRedirectDirectoryListener()
{
    return function redirect(res)
    {
        if (this.hasTrailingSlash())
        {
            this.error(404)
            return
        }

        // get original URL
        const originalUrl = new URL(this.req.path);

        // append trailing slash
        originalUrl.pathname = collapseLeadingSlashes(originalUrl.pathname + '/')

        // reformat the URL
        const loc = encodeURI(originalUrl.toString())
        const doc = createHtmlDocument('Redirecting', 'Redirecting to <a href="' + escapeHtml(loc) + '">' +
            escapeHtml(loc) + '</a>')

        // send redirect response
        res.statusCode = 301
        res.setHeader('Content-Type', 'text/html; charset=UTF-8')
        res.setHeader('Content-Length', Buffer.byteLength(doc))
        res.setHeader('Content-Security-Policy', "default-src 'none'")
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Location', loc)
        res.end(doc)
    }

}