import { State } from "../state.js";
import removeSession from "./session/remove-session.js";

export default async function (this: State, connectionId: string)
{
    if (connectionId)
        await removeSession.call(this, connectionId);
}