import { Controller, OnStart, OnInit, Dependency, Modding } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult } from "shared/util/input";
import { Players, Workspace } from "@rbxts/services";
import { GlobalFunctions } from "shared/network";
import { Mouse, MouseButton, OnMouseButton } from "./mouse.controller";
import { HudController } from "./hud.controller";

import { EntityState, SprintState } from "shared/util/lib";
import { Components } from "@flamework/components";
import { Animator } from "../../shared/components/animator.component";
import { StatefulComponent } from "shared/components/state.component";
import { CombatController } from "./combat.controller";
import { CharacterController2D } from "./2dcontroller.controller";
import { CharacterController3D } from "./3dcontroller.controller";

import { Camera3D, CameraController3D } from "./camera3d.controller";
import { Camera2D, CameraController2D } from "./camera2d.controller";

const { client: ClientFunctions } = GlobalFunctions;
export interface OnRespawn {
    onRespawn(character: Model): void,
}

@Controller({})
export class Client implements OnStart, OnInit, OnMouseButton, OnRespawn
{
    private respawnTrackers: Set<OnRespawn> = new Set();

    constructor(
        private readonly camera2D: CameraController2D,
        private readonly camera3D: CameraController3D,
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
        Modding.onListenerAdded<OnRespawn>((a) => this.respawnTrackers.add(a));
        Modding.onListenerRemoved<OnRespawn>((a) => this.respawnTrackers.delete(a));

        this.player.CharacterAdded.Connect((char) =>
        {
            this.respawnTrackers.forEach(async (l) =>
            {
                l.onRespawn(char);
            });
        });
    }

    onRespawn(characterModel: Model)
    {
        const JaneDummy = Workspace.WaitForChild("jane") as Model;
        const components = Dependency<Components>();

        this.character = characterModel;
        characterModel.WaitForChild("Humanoid").WaitForChild("Animator");
        components.addComponent(characterModel, Animator.Animator);
        components.addComponent(characterModel, StatefulComponent);

        this.characterController2D.SetAxisTowardsModel(JaneDummy);
        this.characterController2D.SetEnabled(true);

        print("character model on respawn:", characterModel);
        this.camera2D.SetParticipants(JaneDummy);
        this.camera2D.SetCameraEnabled(true);
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

                if (this.camera3D.IsEnabled())
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

    public readonly player = Players.LocalPlayer as Player & {
        PlayerGui: PlayerGui,
    };

    public character = this.player.Character;
}