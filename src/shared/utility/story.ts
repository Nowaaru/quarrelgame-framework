
import Roact from "@rbxts/roact";
import { withHookDetection } from "@rbxts/roact-hooked";

interface StoryOptions<T = {}> {
    component: Roact.FunctionComponent<T>,
    target?: Instance,
    onDestroy?: () => void,
}

export function story<T = {}>(options: StoryOptions<T>)
{
    return function (internalTarget: Instance)
    {
        withHookDetection(Roact);
        const handle = Roact.mount(
            Roact.createElement(options.component),
            options.target ?? internalTarget
        );

        return function()
        {
            options.onDestroy?.();
            Roact.unmount(handle);
        };
    };
}