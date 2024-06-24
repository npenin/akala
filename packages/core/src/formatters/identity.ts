function identity<T>(a: T): T
{
    return a;
}

identity['reverse'] = identity;

export default identity;