import loader from '../loader'
import State from '../state'

export default function (this: State, extension: string, loader: loader.container)
{
    this.loaders[extension] = loader;
}