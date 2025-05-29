
import { bootstrapModule, Control, LocationService, OutletService, service, serviceModule, webComponent } from '@akala/client';
import { Http, isPromiseLike, module, ObservableArray, SimpleInjector, SpecificInjector } from '@akala/core';

// export interface Tile
// {
//     text: string,
//     icon?: IconName,
//     iconLibrary?: IconPrefix,
//     url?: string | PromiseLike<string>,
//     cmd?: string,
//     color?: BlockColors;
//     click?(...args: unknown[]): boolean | void;
// }

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

// type TileCallback = (Tile) => void;
export type TileDef = Tile | PromiseLike<Tile>;

export const tileService = Symbol('Tile Manager Service');

type TileProvider<T> = (config: T) => TileDef

@service('tile')
class TileManagerService
{
    private readonly tileProviders: SimpleInjector & SpecificInjector<TileProvider<unknown>> = new SimpleInjector();

    public register(name: string, provider: TileProvider<unknown>)
    {
        this.tileProviders.register(name, provider);
    }

    public newGrid(element: Element, width: number): GridManager
    {
        return new GridManager(element, width)
    }
}
type Position = { x: number; y: number };

type TileSize = {
    width: number; // in grid units
    height: number;
};

interface Tile
{
    id: string;
    size: TileSize;
    position: Position; // top-left position
    element?: HTMLElement;
}

export class GridManager
{
    private grid: (Tile | null)[][];
    private cols: number;

    constructor(private readonly container: HTMLElement, cols: number)
    {
        this.cols = cols;
        this.grid = [];
        this.updateGridStyle();
    }

    private ensureRowExists(y: number)
    {
        while (this.grid.length <= y)
        {
            this.grid.push(Array(this.cols).fill(null));
        }
        this.updateGridStyle();
    }

    private updateGridStyle()
    {
        this.container.style.gridTemplateColumns = `repeat(${this.cols}, 50px)`;
        this.container.style.gridTemplateRows = `repeat(${this.grid.length}, 50px)`;
    }

    private isOccupied(x: number, y: number): boolean
    {
        if (x < 0 || x >= this.cols || y < 0) return true;
        this.ensureRowExists(y);
        return this.grid[y][x] !== null;
    }

    private canPlace(tile: Tile): boolean
    {
        for (let dx = 0; dx < tile.size.width; dx++)
        {
            for (let dy = 0; dy < tile.size.height; dy++)
            {
                const x = tile.position.x + dx;
                const y = tile.position.y + dy;
                if (this.isOccupied(x, y)) return false;
            }
        }
        return true;
    }

    placeTile(tile: Tile): boolean
    {
        if (!this.canPlace(tile)) return false;

        for (let dx = 0; dx < tile.size.width; dx++)
        {
            for (let dy = 0; dy < tile.size.height; dy++)
            {
                const x = tile.position.x + dx;
                const y = tile.position.y + dy;
                this.ensureRowExists(y);
                this.grid[y][x] = tile;
            }
        }

        const el = document.createElement("div");
        el.className = "tile";
        el.style.gridColumn = `${tile.position.x + 1} / span ${tile.size.width}`;
        el.style.gridRow = `${tile.position.y + 1} / span ${tile.size.height}`;
        el.textContent = tile.id;
        this.container.appendChild(el);

        tile.element = el;
        return true;
    }

    removeTile(tile: Tile): void
    {
        for (let dx = 0; dx < tile.size.width; dx++)
        {
            for (let dy = 0; dy < tile.size.height; dy++)
            {
                const x = tile.position.x + dx;
                const y = tile.position.y + dy;
                if (this.grid[y]?.[x] === tile)
                {
                    this.grid[y][x] = null;
                }
            }
        }

        if (tile.element)
        {
            this.container.removeChild(tile.element);
        }
    }
}

(function ()
{

    const list: ObservableArray<TileDef> = new ObservableArray<TileDef>([]);
    window['tiles'] = {
        add: function (tile: TileDef)
        {
            list.push(tile);
        },
        array: list
    }

    @webComponent('kl-color')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    class BlockColor extends Control<{ color?: string }>
    {
        constructor(element: Element)
        {
            super(element);
        }

        public apply(target: unknown, element: Element, parameter: string): void
        {
            if (typeof parameter == 'undefined')
                parameter = BlockColors[Math.floor(Math.random() * Object.keys(BlockColors).length / 2)];
            element.classList.add('block-' + parameter);
        }
    }

    bootstrapModule.ready([[serviceModule, OutletService.InjectionToken]], function (part: OutletService)
    {
        part.use('/', 'body', {
            template: '/@akala-modules/pages/tiles.html', controller: async function (scope)
            {
                scope['list'] = list;

                scope['tileClick'] = function (tile: Tile, $location: LocationService, $http: Http)
                {
                    if (tile.url)
                        if (isPromiseLike(tile.url))
                            return tile.url.then(function (url) { $location.show(url) });
                        else
                            $location.show(tile.url);
                    if (tile.cmd)
                        return $http.get(tile.cmd)
                }

            }
        });
    });
})();
