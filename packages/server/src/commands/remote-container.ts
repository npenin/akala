import { State } from "../state";
import { Container, Metadata } from "@akala/commands";
import { HttpRouter } from "../router";

export default async function route(this: State, target: Container<void>, route: string, metaContainer?: Metadata.Container)
{
    console.log('registering route to ' + target + ' as ' + route);

    var router = this.app;
    if (route)
    {
        router = new HttpRouter({ name: 'remote-container-' + target.name });
        this.app.use(route, router.router);
    }
    if (!metaContainer)
        metaContainer = await target.dispatch('$metadata');
    // console.log('metaContainer');
    // console.log(metaContainer);
    target.attach('http', { router, meta: metaContainer });
}