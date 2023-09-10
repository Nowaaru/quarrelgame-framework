import { Controller, OnStart, OnInit } from "@flamework/core";
import Thread from "@rbxts/luau-thread";
import Make from "@rbxts/make";
import { Players, RunService, Workspace } from "@rbxts/services";
import { Identifier } from "shared/util/identifier";

@Controller({})
export class ViewportManager2D implements OnStart, OnInit {
    private playerGui = Players.LocalPlayer.WaitForChild("PlayerGui") as PlayerGui;

    private containerScreenGui = Make("ScreenGui", {
        Parent: this.playerGui,
        Name: "ViewportContainer",
        ResetOnSpawn: false,
        IgnoreGuiInset: true,
    });

    private participantViewportFrames: Map<Player, ViewportFrame> = new Map();
    
    onInit() 
    {
        print("eeenitiated");
    }

    onStart() 
    {
        print("on start.");
        const onPlayerAdded = (player: Player) =>
        {
            print("player added");
            let worldModelParent: WorldModel;
            let newCamera = new Instance("Camera");

            this.participantViewportFrames.set(player, Make("ViewportFrame", {
                Parent: this.containerScreenGui,
                Name: player.GetAttribute("ParticipantId") as string,
                Size: new UDim2(1, 0, 1, 0),
                BackgroundTransparency: 1,
                CurrentCamera: newCamera,
                Children: [
                    (worldModelParent = Make("WorldModel", {
                        Name: "WorldModel",
                    }))
                ]
            }))

            let thisCharacterClone: Model | undefined;
            let thisCharacter: Model | undefined;
            player.CharacterAdded.Connect((character) =>
            {
                let childAdded: RBXScriptConnection | undefined;
                let charRemoving:  RBXScriptConnection | undefined;
                let characterAdded: RBXScriptConnection | undefined;
                let thisCharacterCloneEvent: RBXScriptConnection | undefined;
                thisCharacter = character;

                const onCharRemoving = (char: Model) => {
                    if (!char) 
                    
                        return;

                    if (char !== thisCharacter)

                        return;

                    curClone.Destroy();
                    childAdded?.Disconnect();
                    childAdded = undefined;
                    thisCharacterCloneEvent?.Disconnect();
                    thisCharacterCloneEvent = undefined;
                    charRemoving?.Disconnect();
                    charRemoving = undefined;
                    char.Destroy();
                };

                print("respawned ezpz!")
                task.wait(0.5);
                character.Archivable = true;

                let generateFilterList = (character: Instance) => character.GetDescendants().filter((n) => n.IsA("BasePart") || n.IsA("Motor6D"));
                let cloneFilterList = new Set<Instance>();
                for (const descendant of character.GetDescendants())
                {
                    descendant.Archivable = true
                    descendant.SetAttribute("CloneId", Identifier.Generate())
                }

                cloneFilterList = new Set(generateFilterList(character));
                let curClone = thisCharacterClone = character.Clone();
                childAdded  = character.DescendantAdded.Connect((child) =>
                {
                    const correspondingChildParent = thisCharacterClone?.GetDescendants().find((descendant) => descendant.GetAttribute("CloneId") === child.Parent!.GetAttribute("CloneId"));

                    child.Archivable = true;
                    child.Clone().Parent = correspondingChildParent;
                    child.SetAttribute("CloneId", Identifier.Generate());

                    cloneFilterList = new Set(generateFilterList(character));
                });

                thisCharacterClone.Parent = worldModelParent;
                // const viewportReplicatorModule = Thread.getModuleByTree(...$getModuleTree("data/task/viewportReplicator.task"));
                thisCharacterCloneEvent = RunService.RenderStepped.Connect(() => {
                    if (!thisCharacterClone)

                        return print("no character clone");

                    print(thisCharacter?.GetAttributes());
                    newCamera.CFrame = Workspace.CurrentCamera?.CFrame ?? new CFrame(); 

                    if (thisCharacter !== character)
                    {
                        print("character changed:", thisCharacter, character);

                        return onCharRemoving(thisCharacterClone!);
                    }

                    for (const descendant of cloneFilterList)
                    {
                        if (!thisCharacterClone)

                            return print("that merely just doesn't work")

                        for (const cloneDescendant of thisCharacterClone.GetDescendants())
                        {
                            
                            if (cloneDescendant.GetAttribute("CloneId") === descendant.GetAttribute("CloneId"))
                            {
                                if (cloneDescendant.IsA("BasePart") && descendant.IsA("BasePart"))

                                    cloneDescendant.CFrame = descendant.CFrame;

                                else if (cloneDescendant.IsA("Motor6D") && descendant.IsA("Motor6D"))

                                    cloneDescendant.Transform = descendant.Transform;
                            }
                        }
                    };
                })

                charRemoving = player.CharacterRemoving.Once(onCharRemoving);
            });
        }

        Players.GetPlayers().forEach((p) => {
            onPlayerAdded(p)
        });
    
        Players.PlayerAdded.Connect(onPlayerAdded)
    }
}