import { Modding, OnInit, OnStart } from "@flamework/core";
import { Cmdr } from "@rbxts/cmdr";
import { QuarrelCommands } from "shared/util/lib";

interface OnCmdrLoaded
{
    onCmdrLoaded(): void;
}

export class CommandHandler implements OnStart, OnInit
{
    private onCmdrLoadedHandler: Set<OnCmdrLoaded> = new Set();

    constructor(private _script: LuaSourceContainer)
    {}

    onInit()
    {
        Modding.onListenerAdded<OnCmdrLoaded>((l) => this.onCmdrLoadedHandler.add(l));
        Modding.onListenerRemoved<OnCmdrLoaded>((l) => this.onCmdrLoadedHandler.delete(l));

        const commandHandlers = this._script.WaitForChild("handler").GetChildren() as ModuleScript[];
        let failedCommand: Instances[keyof Omit<Instances, "ModuleScript">];
        assert(commandHandlers.every((c) => (!c.IsA("ModuleScript") ? !!(failedCommand = c) : true)), `instance ${failedCommand!} is not a module script`);

        for (const command of commandHandlers)
            Cmdr.RegisterCommand(QuarrelCommands[command.Name.gsub("handler", "command") as never], command);

        Cmdr.RegisterHooksIn(this._script.WaitForChild("hook"));
    }

    onStart()
    {
    }
}
