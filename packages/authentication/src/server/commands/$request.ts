import { Container } from "@akala/pm";
import { CallbackResponse, Request, Response } from "@akala/server";
import { State } from "../state.js";

export default async function request(this: State, container: Container, req: Request): Promise<CallbackResponse>
{
    const response: CallbackResponse & Response = {} as any;
    this.router.handle(req, response);
    return response;
}