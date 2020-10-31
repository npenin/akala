import { metadata } from "../generator";
import { Container } from "../model/container";
import * as meta from "../metadata";
import { configure } from "../decorators";
import { Command } from "../model/command";

const $metadata = configure({
    "": {
        "inject": [
            "$container",
            "param.0"
        ]
    },
    "cli": {
        "inject": [
            "$container",
            "options.deep"
        ]
    }
})(function $metadata(container: Container<any>, deep: boolean): meta.Container
{
    console.log(container.name);
    return metadata(container, deep);
});
export default $metadata;

