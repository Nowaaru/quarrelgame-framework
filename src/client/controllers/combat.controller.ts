import { Components } from "@flamework/components";
import { Controller, OnStart, OnInit, Dependency } from "@flamework/core";
import { Animator } from "shared/components/animator.component";
import gio from "shared/data/character/gio";
import { ClientFunctions } from "shared/network";
import { Input, InputMode, InputResult } from "shared/util/input";
import { Client, OnRespawn } from "./client.controller";
import { CharacterController2D } from "./2dcontroller.controller";
import { CharacterController3D } from "./3dcontroller.controller";
import { CameraController3D } from "./camera3d.controller";
import { HudController } from "./hud.controller";
import { EntityState } from "shared/util/lib";
import { OnKeyboardInput } from "./keyboard.controller";

@Controller({})
export class CombatController implements OnStart, OnInit, OnRespawn, OnKeyboardInput
{
    private lockOnTarget?: Instance & { Position: Vector3 };

    private character?: Model;

    constructor(
        private readonly cameraController: CameraController3D,
        private readonly hudController: HudController
    )
    {

    }

    private keybindMap = new Map<Enum.KeyCode, Input>([
        [Enum.KeyCode.F, Input.Slash],
        [Enum.KeyCode.V, Input.Heavy],
        [Enum.KeyCode.G, Input.Kick]
    ])

    onRespawn(character: Model): void
    {
        this.character = character;
    }

    private handleOffensiveInput(buttonPressed: Enum.KeyCode)
    {
        const buttonType = this.keybindMap.get(buttonPressed);
        if (!this.character)

            return InputResult.Fail;


        if (buttonType)
        {
            const characterAnimator = Dependency<Components>().getComponent(this.character, Animator.Animator);
            assert(characterAnimator, `no characterAnimator found in character ${this.character}`);

            if (buttonType in gio.Attacks)
            {
                ClientFunctions[ buttonType as Input ].invoke();

                return InputResult.Success;
            }
        }

        return InputResult.Fail;
    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        if (inputMode === InputMode.Release)
        {
            switch (buttonPressed)
            {
                case (Enum.KeyCode.LeftControl):
                {
                    ClientFunctions.Crouch(EntityState.Idle);

                    return InputResult.Success;
                }
            }

            switch (buttonPressed)
            {
                case (Enum.KeyCode.R):
                {
                    print("respawning");
                    ClientFunctions.RespawnCharacter.invoke()
                        .then(() => print("Reloaded character."));

                    return InputResult.Success;
                }

                case (Enum.KeyCode.LeftAlt):
                {
                    this.cameraController.ToggleBattleCameraEnabled().catch((e) =>
                    {
                        warn(e);
                        print(this.cameraController.PlayerModule);
                    });

                    return InputResult.Success;
                }

                case (Enum.KeyCode.LeftControl):
                {
                    ClientFunctions.Crouch(EntityState.Crouch)
                        .catch((e) => warn(`Crouch failed: ${e}`));

                    return InputResult.Success;
                }
            }

            return InputResult.Fail;
        }


        return this.handleOffensiveInput(buttonPressed);
    }

    private lockOnTracker?: RBXScriptConnection;
    public LockOn(target?: Model & { PrimaryPart: Instance }, doFX?: boolean)
    {
        if (target)
        {
            const primaryPart = target?.PrimaryPart;
            this.lockOnTarget = primaryPart;

            if (this.lockOnTracker)

                this.lockOnTracker?.Disconnect?.();

            if (this.lockOnTarget)
            {
                this.hudController.SetLockOnTarget(target);
                this.hudController.SetLockOnEffectEnabled(doFX);
                this.cameraController.SetLockOnTarget(this.lockOnTarget);

                this.lockOnTracker = primaryPart.Destroying.Once(() =>
                {
                    if (this.lockOnTarget === primaryPart)

                        this.LockOn(undefined);
                });

                return;
            }
        }

        this.cameraController.SetLockOnTarget(undefined);
        this.hudController.SetLockOnTarget(undefined);
        this.hudController.SetLockOnEffectEnabled(false);
    }

    onInit()
    {

    }

    onStart()
    {

    }
}