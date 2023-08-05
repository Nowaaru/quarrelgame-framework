import { Controller, OnStart, OnInit, Dependency } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { InputMode, InputResult } from "shared/util/input";
import { ContextActionService, Players } from "@rbxts/services";
import { GlobalFunctions } from "shared/network";
import { BattleCamera, CameraController } from "./camera.controller";
import { Mouse, MouseButton, OnMouseButton, OnMouseMove } from "./mouse.controller";
import { HudController } from "./hud.controller";

import { EntityState, SprintState } from "shared/util/lib";
import { OnGamepadInput } from "./gamepad.controller";
import { Components } from "@flamework/components";
import { Animator } from "../../shared/components/animator.component";
import { StatefulComponent } from "shared/components/state.component";

const { client: ClientFunctions } = GlobalFunctions;

@Controller({})
export class Client implements OnStart, OnInit, OnKeyboardInput, OnMouseButton, BattleCamera
{
    constructor(
        private readonly camera: CameraController,
        private readonly hud: HudController,
        private readonly mouse: Mouse,
    )
    {}

    onInit()
    {
        ContextActionService.UnbindAction("jumpAction");

        Players.LocalPlayer.CameraMinZoomDistance = 8;
        Players.LocalPlayer.CameraMaxZoomDistance = Players.LocalPlayer.CameraMinZoomDistance;
    }

    onStart()
    {
        this.player.CharacterAdded.Connect((char) =>
        {
            char.WaitForChild("Humanoid").WaitForChild("Animator");
            Dependency<Components>().addComponent(char, Animator.Animator);
            Dependency<Components>().addComponent(char, StatefulComponent);
        });
    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        if (inputMode === InputMode.Release)
        {
            switch (buttonPressed)
            {
                case (Enum.KeyCode.LeftShift):
                {
                    ClientFunctions.RequestSprint(SprintState.Walking);
                    break;
                }

                case (Enum.KeyCode.LeftControl):
                {
                    ClientFunctions.Crouch(EntityState.Idle);
                    break;
                }
            }

            return true;
        }

        switch (buttonPressed)
        {
            case (Enum.KeyCode.R):
            {
                ClientFunctions.RespawnCharacter.invoke()
                    .then(() => print("Reloaded character."));

                break;
            }

            case (Enum.KeyCode.E):
            {
                ClientFunctions.KnockbackTest.invoke()
                    .then(() => warn("Knockback test initiated."))
                    .catch((e) => warn(`Knockback test failed: \n${e}`));

                break;
            }

            case (Enum.KeyCode.T):
            {
                ClientFunctions.TrailTest.invoke()
                    .then(() => "Trail test initiated.")
                    .catch(() => "Trail test failed.");

                break;
            }

            case (Enum.KeyCode.H):
            {
                if (this.hud.IsHudEnabled())

                    this.hud.DisableHud();

                else this.hud.EnableHud();
                break;
            }

            case (Enum.KeyCode.LeftShift):
            {
                ClientFunctions.RequestSprint(SprintState.Sprinting);
                break;
            }

            case (Enum.KeyCode.LeftAlt):
            {
                this.camera.ToggleBattleCameraEnabled().catch((e) =>
                {
                    warn(e);
                    print(this.camera.PlayerModule);
                });

                break;
            }

            case (Enum.KeyCode.LeftControl):
            {
                ClientFunctions.Crouch(EntityState.Crouch)
                    .catch((e) => warn(`Crouch failed: ${e}`));

                break;
            }

            case (Enum.KeyCode.Space):
            {
                ClientFunctions.Jump()
                    .catch((e) => warn(`Jump failed: ${e}`));

                break;
            }
        }

        return true;
    }

    onBattleCameraDisabled()
    {
        print("Battle Camera is disabled. Turning off the Widescreen effect.");
        this.hud.SetLockOnEffectEnabled(false);
        this.hud.SetLockOnTarget(undefined);
        this.camera.SetLockOnTarget(undefined);
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
                                    this.hud.SetLockOnEffectEnabled(true);
                                    this.hud.SetLockOnTarget(ancestorModel);
                                    this.camera.SetLockOnTarget(ancestorPrimaryPart);

                                    break;
                                }
                            }
                        }
                    }

                    this.hud.SetLockOnEffectEnabled(false);
                    this.hud.SetLockOnTarget(undefined);
                    this.camera.SetLockOnTarget(undefined);
                    break;
                }

                this.hud.SetLockOnEffectEnabled(false);
                this.camera.SetLockOnTarget(undefined);
                break;
            }
        }
    }

    public readonly player = Players.LocalPlayer;
}