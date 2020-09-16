import { State } from "../state";
import { Container } from "@akala/commands";
import { HttpRouter } from "../router";

export default function route(this: State, target: Container<void>, route: string)
{
    console.log('registering route to ' + target + ' as ' + route);

    var router = this.app;
    if (route)
    {
        router = new HttpRouter();
        this.app.use(route, router.handle);
    }

    target.attach('http', router);
}