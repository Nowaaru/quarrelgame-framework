import { HttpService } from "@rbxts/services";
import { BaseComponent } from "@flamework/components";

export namespace Identifier {
    export function GenerateID<Attributes extends Record<string, AttributeValue>>(component: { attributes: Attributes }, attr: keyof typeof component["attributes"])
    {
        if (component.attributes[ attr ] === "generate")

            component.attributes[ attr ] = HttpService.GenerateGUID(false) as never;
    }
}