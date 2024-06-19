import { CommandContext, Registry } from "@rbxts/cmdr";
import { RunService } from "@rbxts/services";

export = (registry: Registry) =>
{
    registry.RegisterHook("BeforeRun", (commandContext: CommandContext) =>
    {
        if (commandContext.Group !== "Debug")
        {
            if (RunService.IsStudio())
            {
                return "You are not allowed to execute debug commands in production releases.";
            }
        }
    });
};
