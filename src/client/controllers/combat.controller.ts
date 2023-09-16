import { Components } from "@flamework/components";
import { Controller, Dependency, OnInit, OnStart } from "@flamework/core";
import { Animator } from "shared/components/animator.component";
import { Client as ClientNamespace, ClientEvents, ClientFunctions, ServerEvents, ServerFunctions } from "shared/network";
import { Character } from "shared/util/character";
import { Input, InputMode, InputResult } from "shared/util/input";
import { EntityState } from "shared/util/lib";
import { CharacterController2D } from "./2dcontroller.controller";
import { CharacterController3D } from "./3dcontroller.controller";
import { CameraController3D } from "./camera3d.controller";
import { Client, OnRespawn } from "./client.controller";
import { HudController } from "./hud.controller";
import { OnKeyboardInput } from "./keyboard.controller";
import { MotionInput } from "./motioninput.controller";

import { Players } from "@rbxts/services";
import Characters from "shared/data/character";
import { CameraController2D } from "./camera2d.controller";

@Controller({})
export class CombatController implements OnStart, OnInit, OnRespawn, OnKeyboardInput
{
    private selectedCharacter?: Character.Character;

    private lockOnTarget?: Instance & { Position: Vector3; };

    private character?: Model;

    constructor(
        private readonly motionInputController: MotionInput.MotionInputController,
        private readonly cameraController3D: CameraController3D,
        private readonly cameraController2D: CameraController2D,
        private readonly hudController: HudController,
    )
    {}

    private keybindMap = new Map<Enum.KeyCode, Input>([
        [Enum.KeyCode.F, Input.Slash],
        [Enum.KeyCode.V, Input.Heavy],
        [Enum.KeyCode.G, Input.Kick],
    ]);

    onRespawn(character: Model): void
    {
        this.character = character;

        if (Players.LocalPlayer.GetAttribute("MatchId"))
        {
            this.selectedCharacter = Characters.get(Players.LocalPlayer.GetAttribute("SelectedCharacter") as string);
            assert(this.selectedCharacter, `no selected character found (${Players.LocalPlayer.GetAttribute("SelectedCharacter")})`);
        }
        else
        {
            this.selectedCharacter = undefined;
        }
    }

    private handleOffensiveInput(buttonPressed: Enum.KeyCode)
    {
        const buttonType = this.keybindMap.get(buttonPressed);
        if (!this.character)
        {
            return InputResult.Fail;
        }

        if (!this.selectedCharacter)
        {
            return InputResult.Fail;
        }

        assert(Characters.has(this.selectedCharacter.Name), "selected character does not exist");
        if (buttonType)
        {
            const characterAnimator = Dependency<Components>().getComponent(this.character, Animator.Animator);
            assert(characterAnimator, `no characterAnimator found in character ${this.character}`);

            const lockedMotionInput = this.motionInputController.pushToMotionInput(buttonType)!;
            const inputMotion = lockedMotionInput.GetInputsFilterNeutral();
            print("inputMotion", inputMotion);

            if (inputMotion.size() === 1)
            { // this likely means that it's a neutral input
                if (buttonType in Characters.get(this.selectedCharacter.Name)!.Attacks)
                {
                    ClientFunctions[buttonType as Input].invoke();

                    return InputResult.Success;
                }
            }
            else
            {
                ClientFunctions.SubmitMotionInput(inputMotion);
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
                case (Enum.KeyCode.LeftAlt):
                {
                    this.cameraController3D.ToggleCameraEnabled().catch((e) =>
                    {
                        warn(e);
                        print(this.cameraController3D.PlayerModule);
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
    public LockOn(target?: Model & { PrimaryPart: Instance; }, doFX?: boolean)
    {
        if (target)
        {
            const primaryPart = target?.PrimaryPart;
            this.lockOnTarget = primaryPart;

            if (this.lockOnTracker)
            {
                this.lockOnTracker?.Disconnect?.();
            }

            if (this.lockOnTarget)
            {
                this.hudController.SetLockOnTarget(target);
                this.hudController.SetLockOnEffectEnabled(doFX);
                this.cameraController3D.SetLockOnTarget(this.lockOnTarget);

                this.lockOnTracker = primaryPart.Destroying.Once(() =>
                {
                    if (this.lockOnTarget === primaryPart)
                    {
                        this.LockOn(undefined);
                    }
                });

                return;
            }
        }

        this.cameraController3D.SetLockOnTarget(undefined);
        this.hudController.SetLockOnTarget(undefined);
        this.hudController.SetLockOnEffectEnabled(false);
    }

    onInit()
    {
        ClientEvents.SetCombatMode.connect(async (combatMode) =>
        {
            if (combatMode === ClientNamespace.CombatMode.TwoDimensional)
            {
                const thisMatch = await ClientFunctions.GetCurrentMatch();
                assert(thisMatch, "no match found");

                this.cameraController2D.SetCameraEnabled(true);
                this.cameraController2D.SetParticipants(...[...thisMatch.Participants.mapFiltered(({ ParticipantId }) =>
                {
                    return Players.GetPlayers().find((p) => p.GetAttribute("ParticipantId") === ParticipantId)?.Character;
                }) /* ... entity model support here ... */]);
            }
            else
            {
                this.cameraController2D.SetCameraEnabled(false);
            }
        });
    }

    onStart()
    {
    }
}
