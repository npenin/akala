import loader from '../loader'
import State from '../state'

export default async function registerLoader(this: State, extension: string, loader: loader.container)
{
    this.loaders[extension] = loader;
}