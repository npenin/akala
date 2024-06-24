import { serviceModule } from "../common.js"
import { OutletDefinition, OutletService } from "../outlet.js"
import { IScope } from "../scope.js"

export function page(outletName: string, route: string, template: string | Promise<string>)
{
    return function <T extends Partial<Disposable>>(target: new (...args: Parameters<OutletDefinition<IScope<object>>['controller']>) => T)
    {
        serviceModule.activate(['$outlet'], (outlet: OutletService) => outlet.use(route, outletName, {
            template: template,
            controller: (...args) => new target(...args)
        }))
    }
}