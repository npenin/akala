import { SocketAdapter } from "@akala/json-rpc-ws";
import State from "../state.js";

export default function (this: State, connectionId: string, socket: SocketAdapter)
{
    this.bridges[connectionId].left.off('message');
    socket.off('message');
    this.bridges[connectionId].left.pipe(socket);
    socket.pipe(this.bridges[connectionId].left);
    socket.on('close', () => this.bridges[connectionId].left.close());
    this.bridges[connectionId].left.on('close', () => socket.close());
    this.bridges[connectionId].right = socket;
    return true;
} 