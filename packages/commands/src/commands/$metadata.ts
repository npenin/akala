import { metadata } from "../generator";
import { Container } from "../model/container";
import * as meta from "../metadata";

export default function $metadata(container: Container<any>, deep: boolean): meta.Container
{
    return metadata(container, deep);
}

$metadata.$inject = ['container', 'param.0'];
