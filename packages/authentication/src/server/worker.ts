import * as fs from 'fs'
import * as jsonrpc from '@akala/json-rpc-ws'

function readTokenIfExistsSync(): string
{
    if (fs.existsSync('./local-token.json'))
        return fs.readFileSync('./local-token.json', 'utf8');
    return null;
}

var token = readTokenIfExistsSync();

var connect = jsonrpc.Client.prototype.connect;
jsonrpc.Client.prototype.connect = async function (address, callback)
{
    if (typeof (token) == 'undefined')
    {
        var fileChecker = setInterval(function ()
        {
            token = readTokenIfExistsSync();
            if (typeof (token) != 'undefined')
            {
                clearInterval(fileChecker);
                connect.call(this, address + '?access_token=' + token, callback);
            }
        }, 200)
    }
    else
        return connect.call(this, address + '?access_token=' + token, callback);
}