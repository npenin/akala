/// <reference types="socket.io" />
import * as di from '@akala/core';
export declare class SharedComponent<T extends Component> {
    private eventName;
    constructor(eventName: string);
    receive(onAdd: (it: T) => void): void;
    registerMaster(): void;
}
export declare abstract class ComponentFactory<T extends Component> implements di.IFactory<T> {
    protected config: any;
    protected bus: SocketIO.Socket;
    constructor(config: any, bus?: SocketIO.Socket);
    abstract build(): T;
}
export declare abstract class Component {
    protected eventName: string;
    protected bus: SocketIO.Socket;
    constructor(eventName: string, bus?: SocketIO.Socket);
    merge(o: any): void;
    serialize(): {};
    register(): void;
}
