import { Container } from "@akala/commands";
import { State } from '../state.js';
import { AuthenticationStore } from '../authentication-store.js';
import { PersistenceEngine, providers } from "@akala/storage";

export default async function (container: Container<State>, providerName: string, options: any)
{
    const provider = new (providers.resolve<new () => PersistenceEngine<any>>(providerName));
    await provider.init(options);

    container.state.store = await AuthenticationStore.create(provider);
}