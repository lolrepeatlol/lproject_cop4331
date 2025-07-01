const app_name = 'ucfgroup9.xyz'

export function buildPath(route)
{
    if (process.env.NODE_ENV !== 'development') 
    {
        return `http://${app_name}:5000/${route}`;
    } 
    else 
    {
        return `http://localhost:5000/${route}`;
    }
}
