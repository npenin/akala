import { EventEmitter, MiddlewareAsync, MiddlewarePromise, NotHandled, Event, HttpStatusCode, ErrorWithStatus } from "@akala/core";
import { Request, Response } from './shared.js'
import { resolve } from 'path'
import escapeHtml from 'escape-html';
import { pathToFileURL } from "url";
import fsHandler, { FileSystemProvider } from '@akala/fs'

export interface Options 
{
    fallthrough?: boolean;
    redirect?: boolean;
    setHeaders?(): void;
    maxAge?: string | number;
    root?: string;
    fs?: Promise<FileSystemProvider<unknown>>
}

export class SendFileStream extends EventEmitter<{ error: Event<[ErrorWithStatus]>, directory: Event<[Request]>, headers: Event<[Request['headers']]>, file: Event<[]>, close: Event<[]> }>
{
    constructor(private readonly request: Request, private readonly path: string, private readonly options: Options)
    {
        super();
    }

    public async pipe(response: Response)
    {
        switch (typeof this.options.maxAge)
        {
            case 'string':
                break;
            case 'number':
                if (this.options.maxAge > 0)
                {
                    const stat = await (await this.options.fs).stat(this.path);
                    if (this.request.headers["last-modified"] && stat.mtime > new Date(this.request.headers["last-modified"]))
                        return response.sendStatus(HttpStatusCode.NotModified);
                }
                break;
            default:
                break;
        }
    }
}

export class StaticFileMiddleware implements MiddlewareAsync<[Request, Response]>
{
    private readonly options: Options;
    onDirectory: (res: Request) => void;
    fs: Promise<FileSystemProvider<unknown>>;

    constructor(root?: string, options?: Options)
    {
        this.options = options = Object.create(options || null);

        options.redirect = options.redirect !== false

        // headers listener
        if (options.setHeaders && typeof options.setHeaders !== 'function')
            throw new TypeError('option setHeaders must be function')

        // setup options for send
        options.maxAge = options.maxAge || 0
        if (!options.root)
            options.root = root && resolve(root);
        if (options.root && !this.fs)
            options.fs = fsHandler.process(typeof (options.root) !== 'string' || URL.canParse(options.root) ? new URL(options.root) : pathToFileURL(options.root))

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
                return NotHandled
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
        const stream = new SendFileStream(req, path, this.options)

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
                if (forwardError || (err.statusCode >= 400 && err.statusCode != 404))
                {
                    resolve(err)
                    return
                }

                resolve(undefined)
            })

            // pipe
            stream.pipe(res);

            stream.on('close', () => reject(res));
        })
    }
}


/**
 * Collapse all leading slashes into a single slash
 * @private
 */
function collapseLeadingSlashes(str: string)
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
        ? '/' + str.substring(i)
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
