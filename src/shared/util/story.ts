
import Roact from "@rbxts/roact";
import { withHookDetection } from "@rbxts/roact-hooked";

interface StoryOptions<Props extends Record<string, defined>> {
    component: Roact.FunctionComponent<Props>,
    props?: Props,
    target?: Instance,
    onDestroy?: () => void,
}

export function story<T extends {}>(options: StoryOptions<T>)
{
    return function (internalTarget: Instance)
    {
        withHookDetection(Roact);
        const handle = Roact.mount(
            Roact.createElement(options.component, options?.props),
            options.target ?? internalTarget
        );

        return function()
        {
            options.onDestroy?.();
            Roact.unmount(handle);
        };
    };
}