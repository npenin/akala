import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";

export default async function (this: State, sessionId: string, expiresOn?: Date | string)
{
    const session = await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    switch (typeof expiresOn)
    {
        case 'string':
            session.expiresOn = new Date(expiresOn);
            break;
        case 'object':
            session.expiresOn = expiresOn;
            break;
        case 'undefined':
            if (this.session.timeout && !session.expiresOn)
                session.expiresOn = new Date(session.createdOn.valueOf() + this.session.timeout);
            else if (this.session.slidingExpiration)
                session.expiresOn = new Date(new Date().valueOf() + this.session.slidingExpiration);

    }

    session.expiresOn = typeof expiresOn == 'string' ? new Date(expiresOn) : expiresOn;

    await this.store.Session.updateSingle(session);
    return session;
}