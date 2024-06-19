import Roact from "@rbxts/roact";

interface StoryOptions<Props extends Record<string, defined>>
{
    component: Roact.FunctionComponent<Props>;
    props?: Props;
    target?: Instance;
    onDestroy?: () => void;
}

export function story<T extends {}>(options: StoryOptions<T>)
{
    return function(internalTarget: Instance)
    {
        const handle = Roact.mount(
            Roact.createElement(options.component, options?.props),
            options.target ?? internalTarget,
        );

        return function()
        {
            options.onDestroy?.();
            Roact.unmount(handle);
        };
    };
}
