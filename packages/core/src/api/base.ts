import { Proxy } from '../each'
import { extend } from '../helpers'

import * as debug from 'debug'
import { PayloadDataType, Payload } from '@akala/json-rpc-ws/lib/connection';

var log = debug('akala:metadata')
var clientLog = debug('akala:metadata:client');

export class Api<
    TConfig,
    TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>
{
    constructor()
    {
    }

    public serverOneWayKeys: (keyof (TServerOneWay | TServerOneWayProxy))[] = [];
    public serverTwoWayKeys: (keyof (TServerTwoWay | TServerTwoWayProxy))[] = [];
    public clientOneWayKeys: (keyof (TClientOneWay | TClientOneWayProxy))[] = [];
    public clientTwoWayKeys: (keyof (TClientTwoWay | TClientTwoWayProxy))[] = [];

    connection<TConnectionNew extends TConnection>(): Api<TConfig, TConnectionNew, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return <any>this;
    }

    clientToServerOneWay<TIn>(): <TImpl extends TConfig>(impl: TImpl) => Api<
        TConfig,
        TConnection,
        TServerOneWay & Proxy<TImpl, (this: TServerOneWay & TServerTwoWay & { $proxy(socket: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy> }, p: TIn, connection?: TConnection) => PromiseLike<void> | void>,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<void>>,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.serverOneWayKeys = this.serverOneWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    clientToServer<TIn, TOut>(): <TImpl extends TConfig>(impl: TImpl) => Api<
        TConfig,
        TConnection,
        TServerOneWay,
        TServerTwoWay & Proxy<TImpl, (this: TServerOneWay & TServerTwoWay & { $proxy(socket: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy> }, p: TIn, connection?: TConnection) => TOut | PromiseLike<TOut>>,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<TOut>>,
        TClientOneWayProxy,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.serverTwoWayKeys = this.serverTwoWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    serverToClientOneWay<TIn>(): <TImpl extends TConfig>(impl: TImpl) => Api<
        TConfig,
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay & Proxy<TImpl, (p: TIn) => PromiseLike<void> | void>,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<void>>,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.clientOneWayKeys = this.clientOneWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    serverToClient<TIn, TOut>(): <TImpl>(impl: TImpl) => Api<
        TConfig,
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay & Proxy<TImpl, (p: TIn) => TOut | PromiseLike<TOut>>,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<TOut>>>
    {
        return (impl) =>
        {
            this.clientTwoWayKeys = this.clientTwoWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }
}

export class DualApi<
    TConfig,
    TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay,
    TOConfig,
    TOConnection,
    TOServerOneWay,
    TOServerTwoWay,
    TOClientOneWay,
    TOClientTwoWay,
    TOServerOneWayProxy extends TOServerOneWay,
    TOServerTwoWayProxy extends TOServerTwoWay,
    TOClientOneWayProxy extends TOClientOneWay,
    TOClientTwoWayProxy extends TOClientTwoWay>
    extends Api<
    TConfig & TOConfig,
    TConnection & TOConnection,
    TServerOneWay & TOServerOneWay,
    TServerTwoWay & TOServerTwoWay,
    TClientOneWay & TOClientOneWay,
    TClientTwoWay & TOClientTwoWay,
    TServerOneWayProxy & TOServerOneWayProxy,
    TServerTwoWayProxy & TOServerTwoWayProxy,
    TClientOneWayProxy & TOClientOneWayProxy,
    TClientTwoWayProxy & TOClientTwoWayProxy>
{
    constructor(meta1: Api<
        TConfig,
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>,
        meta2: Api<
            TOConfig,
            TOConnection,
            TOServerOneWay,
            TOServerTwoWay,
            TOClientOneWay,
            TOClientTwoWay,
            TOServerOneWayProxy,
            TOServerTwoWayProxy,
            TOClientOneWayProxy,
            TOClientTwoWayProxy>)
    {
        super();
        this.clientOneWayKeys = (<(keyof (TClientOneWay & TOClientOneWay))[]>(<any>meta1).clientOneWayKeys).concat((<any>meta2).clientOneWayKeys);
        this.clientTwoWayKeys = (<(keyof (TClientTwoWay & TOClientTwoWay))[]>(<any>meta1).clientTwoWayKeys).concat((<any>meta2).clientTwoWayKeys);
        this.serverOneWayKeys = (<(keyof (TServerOneWay & TOServerOneWay))[]>(<any>meta1).serverOneWayKeys).concat((<any>meta2).serverOneWayKeys);
        this.serverTwoWayKeys = (<(keyof (TServerTwoWay & TOServerTwoWay))[]>(<any>meta1).serverTwoWayKeys).concat((<any>meta2).serverTwoWayKeys);

    }
}