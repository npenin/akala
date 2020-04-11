
import * as akala from '@akala/client';
import { IconName, IconPrefix } from '@fortawesome/fontawesome-common-types'

export interface Tile
{
    text: string,
    icon?: IconName,
    iconLibrary?: IconPrefix,
    url?: string,
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

    @akala.control()
    class BlockColor extends akala.BaseControl<string>
    {
        constructor()
        {
            super('color');
        }

        public link(target: any, element: Element, parameter: akala.Binding | string): any
        {
            if (parameter instanceof akala.Binding)
            {
                parameter.onChanged(function (e)
                {
                    var color = e.eventArgs.value;
                    if (typeof color == 'undefined')
                        color = Math.floor(Math.random() * Object.keys(BlockColors).length / 2);

                    if (akala.isPromiseLike(e.eventArgs.value))
                        e.eventArgs.value.then((value) => { element.classList.add('block-' + BlockColors[value]) });
                    else if (typeof e.eventArgs.value == 'undefined')
                        element.classList.add('block-' + BlockColors[color]);
                });
            }
            else 
            {
                if (typeof parameter == 'undefined')
                    parameter = BlockColors[Math.floor(Math.random() * Object.keys(BlockColors).length / 2)];
                element.classList.add('block-' + parameter);
            }
        }
    }

    akala.run(['$part'], function (part: akala.Part)
    {
        part.use('/', 'body', {
            template: '/@akala-modules/pages/tiles.html', controller: function (scope)
            {
                scope['list'] = list;

                scope['tileClick'] = function (tile: Tile, $location: akala.LocationService, $http: akala.Http)
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