
/**
 * Enumeration of standard HTTP status codes with descriptive documentation.
 */
export enum HttpStatusCode
{
    /** Continue (100) - The server has received the request headers */
    Continue = 100,
    /** Switching Protocols (101) - The server is switching protocols */
    SwitchingProtocols = 101,
    /** Processing (102) - The server is processing the request */
    Processing = 102,
    /** Early Hints (103) - Preload hinting information */
    EarlyHints = 103,

    /** OK (200) - Standard success response */
    OK = 200,
    /** Created (201) - Resource created successfully */
    Created = 201,
    /** Accepted (202) - Request accepted for processing */
    Accepted = 202,
    /** Non-Authoritative Information (203) - Response from cache or third party */
    NonAuthoritativeInformation = 203,
    /** No Content (204) - Successful with no body */
    NoContent = 204,
    /** Reset Content (205) - Client should reset document view */
    ResetContent = 205,
    /** Partial Content (206) - Partial content response */
    PartialContent = 206,
    /** Multi-Status (207) - Multiple status codes for WebDAV */
    MultiStatus = 207,
    /** Already Reported (208) - WebDAV binding members listed */
    AlreadyReported = 208,
    /** IM Used (226) - Instance manipulation applied */
    IMUsed = 226,

    /** Multiple Choices (300) - Multiple redirect options */
    MultipleChoices = 300,
    /** Moved Permanently (301) - Resource permanently moved */
    MovedPermanently = 301,
    /** Found (302) - Temporary redirect */
    Found = 302,
    /** See Other (303) - Redirect via GET */
    SeeOther = 303,
    /** Not Modified (304) - Cached response valid */
    NotModified = 304,
    /** Use Proxy (305) - Use proxy specified */
    UseProxy = 305,
    /** Temporary Redirect (307) - Temporary redirection */
    TemporaryRedirect = 307,
    /** Permanent Redirect (308) - Permanent redirection */
    PermanentRedirect = 308,

    /** Bad Request (400) - Malformed request syntax */
    BadRequest = 400,
    /** Unauthorized (401) - Authentication required */
    Unauthorized = 401,
    /** Payment Required (402) - Payment required */
    PaymentRequired = 402,
    /** Forbidden (403) - Insufficient permissions */
    Forbidden = 403,
    /** Not Found (404) - Resource not found */
    NotFound = 404,
    /** Method Not Allowed (405) - Unsupported HTTP method */
    MethodNotAllowed = 405,
    /** Not Acceptable (406) - Can't satisfy accept headers */
    NotAcceptable = 406,
    /** Proxy Authentication Required (407) - Proxy auth needed */
    ProxyAuthenticationRequired = 407,
    /** Request Timeout (408) - Server timed out waiting */
    RequestTimeout = 408,
    /** Conflict (409) - Resource state conflict */
    Conflict = 409,
    /** Gone (410) - Resource permanently unavailable */
    Gone = 410,
    /** Length Required (411) - Content-Length missing */
    LengthRequired = 411,
    /** Precondition Failed (412) - Server precondition failed */
    PreconditionFailed = 412,
    /** Payload Too Large (413) - Request entity too large */
    PayloadTooLarge = 413,
    /** URI Too Long (414) - Request URI too long */
    URITooLong = 414,
    /** Unsupported Media Type (415) - Unsupported content type */
    UnsupportedMediaType = 415,
    /** Range Not Satisfiable (416) - Can't satisfy range request */
    RangeNotSatisfiable = 416,
    /** Expectation Failed (417) - Can't meet Expect header */
    ExpectationFailed = 417,
    /** I'm a teapot (418) - April Fools joke code */
    IAmATeapot = 418,
    /** Misdirected Request (421) - Wrong server path */
    MisdirectedRequest = 421,
    /** Unprocessable Entity (422) - Semantic errors */
    UnprocessableEntity = 422,
    /** Locked (423) - WebDAV resource locked */
    Locked = 423,
    /** Failed Dependency (424) - WebDAV dependency failed */
    FailedDependency = 424,
    /** Too Early (425) - Risk of replay request */
    TooEarly = 425,
    /** Upgrade Required (426) - Protocol upgrade needed */
    UpgradeRequired = 426,
    /** Precondition Required (428) - Conditional request required */
    PreconditionRequired = 428,
    /** Too Many Requests (429) - Rate limiting */
    TooManyRequests = 429,
    /** Request Header Fields Too Large (431) - Headers too large */
    RequestHeaderFieldsTooLarge = 431,
    /** Unavailable For Legal Reasons (451) - Legal restriction */
    UnavailableForLegalReasons = 451,

    /** Internal Server Error (500) - Generic server error */
    InternalServerError = 500,
    /** NotImplemented (501) - Unsupported functionality */
    NotImplemented = 501,
    /** Bad Gateway (502) - Invalid upstream response */
    BadGateway = 502,
    /** Service Unavailable (503) - Temporary overload */
    ServiceUnavailable = 503,
    /** Gateway Timeout (504) - Upstream timeout */
    GatewayTimeout = 504,
    /** HTTP Version Not Supported (505) - Unsupported version */
    HTTPVersionNotSupported = 505,
    /** Variant Also Negotiates (506) - Content negotiation error */
    VariantAlsoNegotiates = 506,
    /** Insufficient Storage (507) - WebDAV storage full */
    InsufficientStorage = 507,
    /** Loop Detected (508) - Infinite loop detected */
    LoopDetected = 508,
    /** Not Extended (510) - Further extensions needed */
    NotExtended = 510,
    /** Network Authentication Required (511) - Network auth required */
    NetworkAuthenticationRequired = 511
}

/** 
 * Error class that includes a status code.
 * @class
 * @property {number} statusCode - The status code associated with the error.
 */
export class ErrorWithStatus extends Error
{
    /** 
     * Creates an instance of ErrorWithStatus.
     * @param {HttpStatusCode | number} statusCode - The HTTP status code.
     * @param {string} [message] - Optional error message. If omitted, a default message is generated based on the statusCode.
     */
    constructor(public readonly statusCode: HttpStatusCode | number, message?: string, name?: string)
    {
        super(message || getMessageFromStatusCode(statusCode));
        if (name)
            this.name = name;
    }
}

export default ErrorWithStatus;

/** 
 * Generates a default error message based on the provided HTTP status code.
 * @param {HttpStatusCode} statusCode - The HTTP status code.
 * @returns {string} - The default error message.
 */
export function getMessageFromStatusCode(statusCode: HttpStatusCode): string
{
    switch (statusCode)
    {
        case HttpStatusCode.BadRequest:
        case HttpStatusCode.MethodNotAllowed:
            return 'Invalid operation';
        case HttpStatusCode.Unauthorized:
            return 'Unauthorized access'
        case HttpStatusCode.Forbidden:
            return 'Forbidden'
        case HttpStatusCode.NotFound:
            return 'Not found';
        case HttpStatusCode.NotAcceptable:
            return 'Not acceptable';
        case HttpStatusCode.RequestTimeout:
            return 'Timeout';
        case HttpStatusCode.Conflict:
        case HttpStatusCode.Locked:
        case HttpStatusCode.InternalServerError:
        case HttpStatusCode.NotImplemented:
        case HttpStatusCode.ServiceUnavailable:
        case HttpStatusCode.InsufficientStorage:
            return HttpStatusCode[statusCode];
    }
}
