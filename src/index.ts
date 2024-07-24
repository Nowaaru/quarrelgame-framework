import { Flamework } from "@flamework/core";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";

export * from "client/controllers/client.controller";
export * from "client/controllers/match.controller";
export * from "client/controllers/motioninput.controller";
export * from "client/controllers/newmotioninput.controller";
export * from "client/controllers/resourcecontroller.controller";

export * from "client/module/character/humanoid";

export * from "client/module/camera/camera2d";
export * from "client/module/character/controller2d";
export * from "client/module/combat/combat2d";

export * from "client/module/camera/camera3d";
export * from "client/module/character/controller3d";
export * from "client/module/combat/combat3d";

export * from "client/controllers/characterselect.controller";
export * from "client/controllers/cmdr.controller";
export * from "client/module/camera";
export * from "client/module/character";
export * from "client/module/combat";
export * from "client/module/extra/cursor";
export * from "client/module/extra/hud";

export * from "server/services/cmdr.service.ts";
export * from "server/services/combat.service";
export * from "server/services/effects.service";
export * from "server/services/matchservice.service";
export * from "server/services/movement.service";
export * from "server/services/quarrelgame.service";
export * from "server/services/resolver.service";
export * from "server/services/scheduler.service";

export * from "client/lib/player";
export * from "shared/util/animation";
export * from "shared/util/boundary";
export * from "shared/util/character";
export * from "shared/util/hitbox";
export * from "shared/util/identifier";
export * from "shared/util/lib";
export * from "shared/util/model";
export * from "shared/util/story";

export * from "server/components/entity.component";
export * from "server/components/map.component";
export * from "server/components/participant.component";
export * from "shared/components/animator.component";
export * from "shared/components/rotator.component";
export * from "shared/components/state.component";

export { Entity as EntityBase, EntityAttributes } from "shared/components/entity.component";
export { ClientEvents, ClientFunctions, ServerEvents, ServerFunctions } from "shared/network";
export { CommandNormal, ConvertMoveDirectionToMotion, Input, InputMode, InputProcessed, InputResult, InputType, Motion } from "shared/util/input";

function addPath(path: string[])
{
    print("path:", path);
    const preloadPaths = new Array<Instance>();
    const service = path.shift();
    let currentPath: Instance = game.GetService(service as keyof Services);
    if (service === "StarterPlayer")
    {
        if (path[0] !== "StarterPlayerScripts")
            throw "StarterPlayer only supports StarterPlayerScripts";

        if (!RunService.IsClient())
            throw "The server cannot load StarterPlayer content";

        currentPath = Players.LocalPlayer.WaitForChild("PlayerScripts");
        path.shift();
    }

    for (let i = 0; i < path.size(); i++)
        currentPath = currentPath.WaitForChild(path[i]);

    preloadPaths.push(currentPath);

    const global = _G as Map<unknown, unknown>;
    const preload = (moduleScript: ModuleScript) =>
    {
        global.set(moduleScript, global.get(script));
        const start = os.clock();
        const [ success, value ] = pcall(require, moduleScript);
        const endTime = math.floor((os.clock() - start) * 1000);
        if (!success)
            throw `${moduleScript.GetFullName()} failed to preload (${endTime}ms): ${value}`;
    };

    for (const path of preloadPaths)
    {
        if (path.IsA("ModuleScript"))
            preload(path);

        for (const instance of path.GetDescendants())
        {
            if (instance.IsA("ModuleScript"))
                preload(instance);
        }
    }
}

class QuarrelGameFramework
{
    private static _executed = false;
    public Initialize()
    {
        assert(QuarrelGameFramework._executed === false, "QuarrelGameFramework.Initialize() should only be called once.");
        assert(Flamework.isInitialized === false, "QuarrelGameFramework.Initialize() should be called before Flamework.ignite().");

        const thisScriptTree = (_script: LuaSourceContainer = script) =>
        {
            let last: Instance | undefined = _script;
            const out = [];

            while (last)
            {
                const servExists = pcall(() => game.GetService(last?.Name as never));
                out.unshift(last.Name);

                if (servExists)
                    break;

                last = last.Parent;
            }

            return out;
        };

        if (RunService.IsServer())
        {
            import("server/network");
            addPath([ ...thisScriptTree(), "server", "services" ]);
        }
        else
        {
            import("client/network");
            addPath([ ...thisScriptTree(), "client", "controllers" ]);
        }

        QuarrelGameFramework._executed = true;

        return Promise.resolve();
    }
}

export default new QuarrelGameFramework();
