import { ILogger, ILogMiddleware, LogMiddlewareWrapper, LogLevels } from "../shared.js";

export class LoggerLogMiddlewareWrapper implements ILogger
{
    error: ILogMiddleware;
    warn: ILogMiddleware;
    help: ILogMiddleware;
    data: ILogMiddleware;
    info: ILogMiddleware;
    debug: ILogMiddleware;
    prompt: ILogMiddleware;
    verbose: ILogMiddleware;
    input: ILogMiddleware;
    silly: ILogMiddleware;

    constructor(logger: ILogMiddleware)
    {
        this.error = new LogMiddlewareWrapper(logger, LogLevels.error, '*');
        this.warn = new LogMiddlewareWrapper(logger, LogLevels.warn, '*');
        this.help = new LogMiddlewareWrapper(logger, LogLevels.help, '*');
        this.data = new LogMiddlewareWrapper(logger, LogLevels.data, '*');
        this.info = new LogMiddlewareWrapper(logger, LogLevels.info, '*');
        this.debug = new LogMiddlewareWrapper(logger, LogLevels.debug, '*');
        this.prompt = new LogMiddlewareWrapper(logger, LogLevels.prompt, '*');
        this.verbose = new LogMiddlewareWrapper(logger, LogLevels.verbose, '*');
        this.input = new LogMiddlewareWrapper(logger, LogLevels.input, '*');
        this.silly = new LogMiddlewareWrapper(logger, LogLevels.silly, '*');
    }
}
