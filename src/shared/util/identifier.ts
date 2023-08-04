import { HttpService } from "@rbxts/services";
import { BaseComponent } from "@flamework/components";

export namespace Identifier {
    export function GenerateID<Attributes extends defined>(component: BaseComponent<Attributes, Instance>, attr: string): string
    {
        print("id generated lfg");
        const generatedId = HttpService.GenerateGUID(false);
        if (component.attributes[ attr as keyof Attributes ] === "generate")

            component.setAttribute(attr as keyof Attributes, generatedId as Attributes[keyof Attributes]);

        return generatedId;
    }
}