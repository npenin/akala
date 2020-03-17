import { Container } from "@akala/commands";
import { HttpRouter } from "../router";
import { serveStatic } from "../master-meta";
import * as yargs from 'yargs-parser'

export default async function route(router: HttpRouter, route: string, target: string, options: yargs.Arguments)
{
    router.use(route, serveStatic(target, options))
}