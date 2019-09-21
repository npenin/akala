import { metadata } from "../generator";
import { Container } from "../container";

export default function (container: Container<any>)
{
    return metadata(container);
}

exports.default.$inject = ['$injector'];
