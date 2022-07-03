import { metadata } from '../generator';
import { Container } from '../model/container';
import * as meta from '../metadata/index';
import { configure } from '../decorators';

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
        ],
        "options": {
            "deep": {
                "aliases": [
                    "d"
                ]
            }
        }
    }
})(function $metadata(container: Container<unknown>, deep: boolean): meta.Container
{
    // console.log(container.name);
    return metadata(container, deep);
});
export default $metadata;

