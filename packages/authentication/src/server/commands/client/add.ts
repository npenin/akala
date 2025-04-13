import { State } from "../../state.js";
import { generateSecret } from "./renew-secret.js";

export default async function (this: State, name: string, isTrusted: boolean, redirectUri: string[], scope: string, signSecret: true): Promise<string>
export default async function (this: State, name: string, isTrusted: boolean, redirectUri: string[], scope: string): Promise<void>
export default async function (this: State, name: string, isTrusted: boolean, redirectUri: string[], scope: string, signSecret?: boolean): Promise<void | string>
{
    const secret = await generateSecret();
    await this.store.Client.createSingle({
        id: crypto.randomUUID(),
        isTrusted,
        name,
        clientSecret: signSecret ? secret.signedSecret : secret.base64EncodedSecret,
        signedClientSecret: signSecret || false,
        redirectUris: redirectUri,
        scope: scope
    });
    if (signSecret)
        return secret.base64EncodedSecret;
} 
