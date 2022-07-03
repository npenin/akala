import { Container } from "@akala/commands";
import { State } from '../state';
import { AuthenticationStore } from '../authentication-store';
import { PersistenceEngine, providers } from "@akala/storage";

export default async function (container: Container<State>, providerName: string, options: unknown)
{
    const provider = new (providers.resolve<new () => PersistenceEngine<unknown>>(providerName));
    await provider.init(options);

    container.state.store = await AuthenticationStore.create(provider);
}