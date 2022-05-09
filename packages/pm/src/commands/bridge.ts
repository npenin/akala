import { Container } from "@akala/commands";
import { SocketAdapter } from "@akala/json-rpc-ws";
import State from "../state";

export default function (this: State, connectionId: string, socket: SocketAdapter)
{
    this.bridges[connectionId].pipe(socket);
    socket.pipe(this.bridges[connectionId]);
} 