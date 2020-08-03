import { metadata } from "../generator";
import { Container } from "../model/container";
import * as meta from "../metadata";
import { configure } from "../decorators";
import { Command } from "../model/command";

export default configure({
    "": {
        inject: [
            "container",
            "param.0"
        ]
    },
    cli: {
        inject: [
            "container",
            "options.deep"
        ]
    }
})<Command>(new Command($metadata, '$metadata'));

function $metadata(container: Container<any>, deep: boolean): meta.Container
{
    return metadata(container, deep);
}

