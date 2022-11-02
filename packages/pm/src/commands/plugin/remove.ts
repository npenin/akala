import State from "../../state";

export default function (this: State, plugin: string)
{
    const indexOfPlugin = this.config.plugins.indexOf(plugin);
    if (indexOfPlugin > -1)
        this.config.plugins.splice(indexOfPlugin);
    return this.config.commit();
}