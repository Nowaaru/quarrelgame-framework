import { BaseComponent } from "@flamework/components";
import { HttpService } from "@rbxts/services";

export namespace Identifier
{
    export function GenerateComponentId<
        C extends BaseComponent<{}, Instance>,
    >(component: C, attr: keyof C["attributes"]): string
    {
        const generatedId = HttpService.GenerateGUID(false);
        if (attr in component.attributes)
        {
            if (component.attributes[attr as never] === "generate")
            {
                component.attributes[attr as never] = Generate() as never;
            }
        }

        return generatedId;
    }

    export function Generate()
    {
        return HttpService.GenerateGUID(false);
    }
}
