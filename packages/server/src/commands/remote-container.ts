import { State } from "../state";
import { Container, Metadata } from "@akala/commands";
import { HttpRouter } from "../router";

export default async function route(this: State, target: Container<void>, route: string, metaContainer?: Metadata.Container): Promise<void>
{
    console.log('registering route to ' + target + ' as ' + route);

    let router = this.app;
    if (route)
    {
        router = new HttpRouter({ name: 'remote-container-' + target.name });
        this.app.useMiddleware(route, router);
    }
    if (!metaContainer)
        metaContainer = await target.dispatch('$metadata');
    // console.log('metaContainer');
    // console.log(metaContainer);
    target.attach('http', { router, meta: metaContainer });
}