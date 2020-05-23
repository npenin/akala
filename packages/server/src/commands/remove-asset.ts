import { State } from "../state";


export default async function unregister(this: State, route: string, path: string)
{
    if (!this.webpack || !this.webpack.config || !this.webpack.config.entry)
        return;

    console.log(this.webpack.config.entry[route])

    if (this.webpack.config.entry[route])
        this.webpack.config.entry[route].splice(this.webpack.config.entry[route].indexOf(path), 1);
}