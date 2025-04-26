import { valtype } from './types.js';

export function type(val: valtype, mut?: boolean) { return [val, mut ? 0x00 : 0x01]; }

export enum global 
{
    get = 0x23,
    set = 0x24,
}