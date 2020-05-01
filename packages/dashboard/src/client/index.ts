
import * as akala from '@akala/core';
import * as client from '@akala/client';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-common-types'

export interface Tile
{
    text: string,
    icon?: IconName,
    iconLibrary?: IconPrefix,
    url?: string | PromiseLike<string>,
    cmd?: string,
    color?: BlockColors;
    click?(...args: any[]): boolean | void;
}

export enum BlockColors
{
    black,
    blue,
    brown,
    green,
    lime,
    magenta,
    orange,
    pink,
    purple,
    red,
    viridian,
}

type TileCallback = (Tile) => void;
export type TileDef = Tile | PromiseLike<Tile>;

(function ()
{
    var list: akala.ObservableArray<TileDef> = new akala.ObservableArray<TileDef>([]);
    window['tiles'] = {
        add: function (tile: TileDef)
        {
            list.push(tile);
        },
        array: list
    }

    @client.control()
    class BlockColor extends client.BaseControl<string>
    {
        constructor()
        {
            super('color');
        }

        public apply(target: any, element: Element, parameter: string): any
        {
            if (typeof parameter == 'undefined')
                parameter = BlockColors[Math.floor(Math.random() * Object.keys(BlockColors).length / 2)];
            element.classList.add('block-' + parameter);
        }
    }

    akala.module('bootstrap').ready(['$part'], function (part: client.Part)
    {
        part.use('/', 'body', {
            template: '/@akala-modules/pages/tiles.html', controller: function (scope)
            {
                scope['list'] = list;

                scope['tileClick'] = function (tile: Tile, $location: client.LocationService, $http: akala.Http)
                {
                    if (tile.url)
                        if (akala.isPromiseLike(tile.url))
                            tile.url.then(function (url) { $location.show(url) });
                        else
                            $location.show(tile.url);
                    if (tile.cmd)
                        $http.get(tile.cmd)
                }

            }
        });
    });
})();

export interface Tiles
{
    add(tile: TileDef);
}