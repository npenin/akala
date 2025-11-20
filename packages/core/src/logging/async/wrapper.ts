import { ILoggerAsync, ILogMiddlewareAsync, LogMiddlewareWrapper, LogLevels } from "../shared.js";

export class LoggerLogMiddlewareWrapperAsync implements ILoggerAsync
{
    error: ILogMiddlewareAsync;
    warn: ILogMiddlewareAsync;
    help: ILogMiddlewareAsync;
    data: ILogMiddlewareAsync;
    info: ILogMiddlewareAsync;
    debug: ILogMiddlewareAsync;
    prompt: ILogMiddlewareAsync;
    verbose: ILogMiddlewareAsync;
    input: ILogMiddlewareAsync;
    silly: ILogMiddlewareAsync;

    constructor(logger: ILogMiddlewareAsync)
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
