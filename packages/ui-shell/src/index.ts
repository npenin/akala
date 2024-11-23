#!/usr/bin/node

import { module } from '@akala/core'
import { connectByPreference, Container } from '@akala/commands'
import { Container as pmContainer, meta as pmMeta } from '@akala/pm'

if (!process.stdin.isTTY)
    process.exit(0)

enum HotKey
{
    Numpad0,
    Numpad1,
    Numpad2,
    Numpad3,
    Numpad4,
    Numpad5,
    Numpad6,
    Numpad7,
    Numpad8,
    Numpad9,
    Up,
    Down,
    Left,
    Right,
    Plus,
    Minus,
    Enter,
    Slash,
    Times,
    Backspace
}

const containerPromise = connectByPreference({ 'jsonrpc+tcp://localhost:31416': {}, 'jsonrpc+tcp://home.dragon-angel.fr:31417': {} }, { metadata: pmMeta, container: null }).then(async c =>
{
    return c.container
});
module('@akala/pm').register('container', containerPromise);

process.stdin.setRawMode(true);
process.stdin.on('data', async function (data)
{
    console.log(data);
    var key: HotKey | undefined = undefined;
    if (data.length == 1)
        switch (data[0])
        {
            case 3:
            case 0x7f:
                process.exit();
            case 0x30:
                key = HotKey.Numpad0;
                break;
            case 0x31:
                key = HotKey.Numpad1;
                break;
            case 0x32:
                key = HotKey.Numpad2;
                break;
            case 0x33:
                key = HotKey.Numpad3;
                break;
            case 0x34:
                key = HotKey.Numpad4;
                break;
            case 0x35:
                key = HotKey.Numpad5;
                break;
            case 0x36:
                key = HotKey.Numpad6;
                break;
            case 0x37:
                key = HotKey.Numpad7;
                break;
            case 0x38:
                key = HotKey.Numpad8;
                break;
            case 0x39:
                key = HotKey.Numpad9;
                break;
            case 0x2b:
                key = HotKey.Plus;
                break;
            default:
                console.error('no bound key for ' + data.toString());
                return;
        }
    else if (data.length == 3 && data[0] == 0x1b && data[1] == 0x5b)
        switch (data[2])
        {
            case 0x41:
                key = HotKey.Up;
                break;
            case 0x42:
                key = HotKey.Down;
                break;
            case 0x43:
                key = HotKey.Right;
                break;
            case 0x44:
                key = HotKey.Left;
                break;
            default:
                console.error('no bound key for ' + data.toString());
                return;
        }
    if (typeof key == 'undefined')
    {
        console.error('no bound key for ' + data.toString());
        return;
    }
    const mapping = await import(process.argv[2]).then(x => x.default);
    var map: (string | number)[] = mapping[HotKey[key] as keyof typeof mapping];
    if (typeof (map) == 'undefined')
    {
        console.error('no bound command for ' + HotKey[key]);
        return;
    }
    const container = await containerPromise as pmContainer & Container<unknown>;
    console.log(await container.dispatch(map[0] as string, ...map.slice(1)));

})
