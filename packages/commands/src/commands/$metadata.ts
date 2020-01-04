import { metadata } from "../generator";
import { Container } from "../container";

export default function $metadata(container: Container<any>)
{
    return metadata(container);
}

$metadata.$inject = ['container'];
