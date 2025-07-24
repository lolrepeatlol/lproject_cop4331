const app_name = 'ucfgroup4.xyz'

export function buildPath(route)
{
    if (process.env.NODE_ENV !== 'development') 
    {
        return `http://${app_name}:5050/${route}`;
    } 
    else 
    {
        return `http://localhost:5050/${route}`;
    }
}
