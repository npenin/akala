/**
 * Extracts all arguments from a function type
 * @typeParam T - Function type to extract arguments from
 */
export type Arguments<T> = T extends ((...x: infer X) => any) ? X : never;

/**
 * Extracts the first argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument0<T> = T extends ((x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the second argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument1<T> = T extends ((a: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the third argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument2<T> = T extends ((a: any, b: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the fourth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument3<T> = T extends ((a: any, b: any, c: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the fifth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument4<T> = T extends ((a: any, b: any, c: any, d: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the sixth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument5<T> = T extends ((a: any, b: any, c: any, d: any, e: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the seventh argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument6<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the eighth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument7<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the ninth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument8<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the tenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument9<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the eleventh argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument10<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the twelfth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument11<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the thirteenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument12<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the fourteenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument13<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the fifteenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument14<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the sixteenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument15<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any, o: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the seventeenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument16<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any, o: any, p: any, x: infer X, ...z: any[]) => any) ? X : never;

/**
 * Extracts the eighteenth argument from a function type
 * @typeParam T - Function type to extract argument from
 */
export type Argument17<T> = T extends ((a: any, b: any, c: any, d: any, e: any, f: any, g: any, h: any, i: any, j: any, k: any, l: any, m: any, n: any, o: any, p: any, q: any, x: infer X, ...z: any[]) => any) ? X : never;
