import loader from '../loader.js'
import State from '../state.js'

export default async function registerLoader(this: State, extension: string, loader: loader.container)
{
    this.loaders[extension] = loader;
}