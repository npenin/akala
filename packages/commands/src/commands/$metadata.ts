import { metadata } from "../generator";
import { Container } from "../model/container";
import * as meta from "../metadata";

export default function $metadata(container: Container<any>): meta.Container
{
    return metadata(container);
}

$metadata.$inject = ['container'];
