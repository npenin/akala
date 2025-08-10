import { Sub as CoreSub } from "../sub.js";
import { type ParsersWithMessage } from "../_common.js";
import { type WireType } from './field.js';


export class Sub<TResult, TMessage> extends CoreSub<TResult, TMessage>
{
    constructor(lengthParser: ParsersWithMessage<number, TMessage>, inner: ParsersWithMessage<TResult, TMessage>)
    {
        super(lengthParser, inner);
    }

    wireType: WireType = 'length-delimited';
}
