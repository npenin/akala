import { mapAsync } from '@akala/core';
import { State } from "../state";

export default function publish(this: State, topic: string, data: any)
{
    return mapAsync(this[topic], el => el.container.dispatch(el.commandToDispatch, data))
}