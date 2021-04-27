import { State } from '../state.js';


export default function unregister(this: State, route: string, path: string): void
{
    if (!this.webpack || !this.webpack.config || !this.webpack.config.entry)
        return;

    console.log(this.webpack.config.entry[route])

    if (this.webpack.config.entry[route])
        this.webpack.config.entry[route].splice(this.webpack.config.entry[route].indexOf(path), 1);
}