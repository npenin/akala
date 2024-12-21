
type CustomCSSStyleDeclaration = Omit<CSSStyleDeclaration, 'getPropertyPriority' | 'getPropertyValue' | 'item' | 'removeProperty' | 'setProperty'>

type ICssStyleHandler = Omit<CSSStyleDeclaration, keyof CustomCSSStyleDeclaration>;
type NextParameters<T extends (...params: unknown[]) => unknown> = T extends (arg1: unknown, ...params: infer X) => unknown ? X : never;
type ICssStyleProxyHandler = { [key in Exclude<keyof ICssStyleHandler, 'item'>]: (source: ICssStyleHandler, ...args: NextParameters<ICssStyleHandler[key]>) => ReturnType<ICssStyleHandler[key]> };

const units = {
    length: {
        font: ['em', 'rem', 'ex', 'rex', 'cap', 'rcap', 'ch', 'rch', 'ic', 'ric', 'lh', 'rlh'],
        viewport: ['vw', 'vh', 'vi', 'vb', 'vmin', 'vmax'],
        absolute: ['cm', 'mm', 'Q', 'in', 'pt', 'pc', 'px']
    },
    angle: ['deg', 'grad', 'rad', 'turn'],
    duration: ['s', 'ms'],
    frequency: ['Hz', 'kHz'],
    resolution: ['dpi', 'dpcm', 'dppx', 'x']
};

const allLengthUnits = units.length.font.concat(units.length.viewport, units.length.absolute);
const allUnits = allLengthUnits.concat(units.angle, units.duration, units.frequency, units.resolution);

export class CssStyleHandler implements ICssStyleHandler
{
    static isUnit(value: string)
    {
        let iValue = parseInt(value);
        if (!isNaN(iValue) && allUnits.includes(value.substring(iValue.toString().length)))
            return true;
        return false;
    }
    public readonly data: { [key in keyof CustomCSSStyleDeclaration]: { value: CustomCSSStyleDeclaration[key], priority: string } }

    public static normalize(property: string): string
    {
        return property.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace(/[\/\.]/g, '-');
    }

    public static resolve(property: string): string[]
    {
        if (property.length > 2 && property[0] == '-' && property[1] == '-')
            return [property];
        return [this.normalize(property)];
    }

    getPropertyPriority(property: string): string
    {
        if (property in propertiesDefinition)
            return propertiesDefinition[property].getPropertyPriority(this);

        return CssStyleHandler.resolve(property).reduce((previous, current) => previous === null ? current : previous == current ? current : '', null);
    }
    getPropertyValue(property: string): string
    {
        if (property in propertiesDefinition)
            return propertiesDefinition[property].getPropertyValue(this);

        return this.data[CssStyleHandler.normalize(property)].value || '';
    }
    item(index: number): string
    {
        return this.getPropertyValue(Object.keys(this.data)[index]);
    }
    removeProperty(property: string): string
    {
        if (property in propertiesDefinition)
            return propertiesDefinition[property].removeProperty(this);

        property = CssStyleHandler.normalize(property)
        const value = this.data[property].value;
        delete this.data[property].value;
        return value;
    }
    setProperty(property: string, value: string | null, priority?: string): void
    {
        if (property in propertiesDefinition)
            return propertiesDefinition[property].setProperty(this, value, priority);

        this.data[CssStyleHandler.normalize(property)] = { value, priority };
    }

}

const propertiesDefinition: Record<string, ICssStyleProxyHandler> = {
    flex: {
        getPropertyValue(source: CssStyleHandler)
        {
            return [source.getPropertyValue('flex-grow'), source.getPropertyValue('flex-shrink'), source.getPropertyValue('flex-basis')].join(' ')
        },
        setProperty(source: CssStyleHandler, value: string, priority?: string)
        {
            const values = value.split(' ');
            switch (values.length)
            {
                case 1:
                    if (CssStyleHandler.isUnit(value))
                        source.setProperty('flex-basis', value, priority);
                    else
                        source.setProperty('flex-grow', value);
                    break;
                case 2:
                    source.setProperty('flex-grow', value[0]);
                    if (CssStyleHandler.isUnit(values[1]))
                        source.setProperty('flex-basis', value[1], priority);
                    else
                        source.setProperty('flex-shrink', value[1]);
                    break;
                case 3:
                    source.setProperty('flex-grow', value[0]);
                    source.setProperty('flex-basis', value[1]);
                    if (!CssStyleHandler.isUnit(values[2]))
                        throw new Error('Invalid property value for flex: ' + value);
                    source.setProperty('flex-basis', value[2], priority);
                    break;
                default:
                    throw new Error('Not supported')
            }
        },
        getPropertyPriority(source)
        {
            return [source.getPropertyValue('flex-grow'), source.getPropertyValue('flex-shrink'), source.getPropertyValue('flex-basis')].join(' ')
        },
        removeProperty(source)
        {
            const grow = source.removeProperty('flex-grow');
            const shrink = source.removeProperty('flex-shrink');
            const basis = source.removeProperty('flex-basis');

            return [grow, shrink, basis].filter(x => x).join(' ');
        }
    }
}

const CssStyleSheetProxyHandler: ProxyHandler<CssStyleHandler> = {
    get(target, p)
    {
        if (typeof p == 'symbol')
            return null;
        switch (p)
        {
            case 'getPropertyPriority':
            case 'getPropertyValue':
            case 'item':
            case 'removeProperty':
            case 'setProperty':
                return target[p];
            default:
                return target.getPropertyValue(p);
        }

    },
    set(target, p, value)
    {
        if (typeof p == 'symbol')
            return false;
        switch (p)
        {
            case 'getPropertyPriority':
            case 'getPropertyValue':
            case 'item':
            case 'removeProperty':
            case 'setProperty':
                return false
            default:
                target.setProperty(p, value);
                return true;
        }
    }
}

export function stylesheet()
{
    return new Proxy(new CssStyleHandler(), CssStyleSheetProxyHandler) as unknown as CSSStyleDeclaration;
}