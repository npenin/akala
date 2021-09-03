import { Container } from "@akala/commands";

export interface State
{
    [key: string]: { container: Container<any>, commandToDispatch: string }[];
}