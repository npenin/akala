export declare type NextFunction = (error?, ...args: any[]) => void;
export declare function array<T>(array: T[], body: (element: T, i: number, next: NextFunction) => void, complete: NextFunction): void;
export declare function object(o: any, body: (element: any, i: string, next: NextFunction) => void, complete: NextFunction): void;
export declare function any<T>(array: T[], body: (element: T, i: number, next: NextFunction) => void, complete: NextFunction): any;
export declare function any(o: any, body: (element: any, i: string, next: NextFunction) => void, complete: NextFunction): any;
