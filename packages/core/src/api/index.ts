import { Api, DualApi, IServerProxyBuilder, IClientBuilder } from './base'

export { Api, DualApi };

import { JsonRpcWs } from './json-rpc-ws'
import * as jsonrpc from '@akala/json-rpc-ws'
import { Rest } from './rest'
import { module } from '../helpers';
import { Http } from '../web';

export function createServerProxy<T, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>(builderName: string, api: Api<TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>, client: T)
{
    var builder: IServerProxyBuilder<T, TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy> = module('$api').resolve(builderName);
    return builder.createServerProxy(client);
}

export function createClient<T, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>(builderName: string, api: Api<TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>, client: T)
{
    var builder: IClientBuilder<T, TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy> = module('$api').resolve(builderName);
    return builder.createClient(client);
}
