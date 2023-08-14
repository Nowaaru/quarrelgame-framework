import { Controller, OnStart, OnInit, Dependency, Modding } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult } from "shared/util/input";
import { Players, Workspace } from "@rbxts/services";
import { GlobalFunctions } from "shared/network";
import { BattleCamera, CameraController3D } from "./camera3d.controller";
import { Mouse, MouseButton, OnMouseButton } from "./mouse.controller";
import { HudController } from "./hud.controller";

import { EntityState, SprintState } from "shared/util/lib";
import { Components } from "@flamework/components";
import { Animator } from "../../shared/components/animator.component";
import { StatefulComponent } from "shared/components/state.component";
import { CombatController } from "./combat.controller";
import { CharacterController2D } from "./2dcontroller.controller";
import { CharacterController3D } from "./3dcontroller.controller";

const { client: ClientFunctions } = GlobalFunctions;
export interface OnRespawn {
    onRespawn(character: Model): void,
}

@Controller({})
export class Client implements OnStart, OnInit, OnMouseButton, BattleCamera
{
    private respawnTrackers: Set<OnRespawn> = new Set();

    constructor(
        private readonly camera: CameraController3D,
        private readonly keyboard: Keyboard,
        private readonly hud: HudController,
        private readonly mouse: Mouse,
        private readonly combatController: CombatController,
        private readonly characterController2D: CharacterController2D,
        private readonly characterController3D: CharacterController3D,
    )
    {}

    onInit()
    {
        Players.LocalPlayer.CameraMinZoomDistance = 8;
        Players.LocalPlayer.CameraMaxZoomDistance = Players.LocalPlayer.CameraMinZoomDistance;
    }

    onStart()
    {
        const components = Dependency<Components>();
        Modding.onListenerAdded<OnRespawn>((a) => this.respawnTrackers.add(a));
        Modding.onListenerRemoved<OnRespawn>((a) => this.respawnTrackers.delete(a));

        this.player.CharacterAdded.Connect((char) =>
        {
            this.character = char;
            char.WaitForChild("Humanoid").WaitForChild("Animator");
            components.addComponent(char, Animator.Animator);
            components.addComponent(char, StatefulComponent);

            this.respawnTrackers.forEach((l) =>
            {
                l.onRespawn(char);
            });

            this.characterController2D.SetAxisTowardsModel(Workspace.WaitForChild("jane") as Model);
            this.characterController2D.SetEnabled(true);
        });
    }

    onBattleCameraDisabled()
    {
        print("Battle Camera is disabled. Turning off the Widescreen effect.");
        this.combatController.LockOn(undefined);
    }

    onMouseButton(mouseButton: MouseButton, inputMode: InputMode): void
    {
        if (inputMode !== InputMode.Down)

            return;

        if (!this.player.Character)

            return;

        switch ( mouseButton )
        {
            case MouseButton.Middle:
            {
                const { Instance: instanceUnderMouse } = this.mouse.Under() ?? {};

                if (this.camera.IsBattleCameraEnabled())
                {
                    if (instanceUnderMouse)
                    {
                        if (!this.hud.IsLockOnEffectEnabled())
                        {
                            if (!instanceUnderMouse.IsDescendantOf(this.player.Character))
                            {
                                const ancestorModel = instanceUnderMouse.FindFirstAncestorWhichIsA("Model");
                                const ancestorPrimaryPart = ancestorModel?.PrimaryPart;
                                const ancestorHumanoid = ancestorModel?.FindFirstChild("Humanoid");

                                if (ancestorHumanoid && ancestorPrimaryPart)
                                {
                                    this.combatController.LockOn(undefined);

                                    break;
                                }
                            }
                        }
                    }

                    break;
                }

                this.combatController.LockOn(undefined);
                break;
            }
        }
    }

    public readonly player = Players.LocalPlayer;

    public character = this.player.Character;
}