import { OnInit, OnStart, Service } from "@flamework/core";
import { Cmdr } from "@rbxts/cmdr";
import { ReplicatedStorage, ServerScriptService } from "@rbxts/services";
import { quarrelAssets, quarrelCommands, quarrelGame } from "shared/util/lib";

@Service({
    loadOrder: -1,
})
export class CmdrService implements OnStart, OnInit
{
    onInit()
    {
        const commandHandlers = script.WaitForChild("handler").GetChildren() as ModuleScript[];
        let failedCommand: Instances[keyof Omit<Instances, "ModuleScript">];
        assert(commandHandlers.every((c) => (!c.IsA("ModuleScript") ? !!(failedCommand = c) : true)), `instance ${failedCommand!} is not a module script`);

        for (const command of commandHandlers)
        {
            Cmdr.RegisterCommand(quarrelCommands[command.Name.gsub("handler", "command") as never], command);
        }

        Cmdr.RegisterHooksIn(script.WaitForChild("hook"));
    }

    onStart()
    {
    }
}
