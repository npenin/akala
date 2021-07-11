export default async function <T>(this: Partial<T>, config: T)
{
    Object.assign(this, config);
}