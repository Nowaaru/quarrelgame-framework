import { HttpService } from "@rbxts/services";
import { BaseComponent } from "@flamework/components";

export namespace Identifier {
    export function GenerateID<Attributes extends defined>(component: BaseComponent<Attributes, Instance>, attr: keyof typeof component["attributes"]): string
    {
        if (component.attributes[ attr ] === "generate")

            return component.attributes[ attr ] = HttpService.GenerateGUID(false) as never;

        return component.attributes[ attr ];
    }
}