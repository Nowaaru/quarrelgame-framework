import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import { MotionInput } from "client/controllers/motioninput.controller";
import { CombatController } from "client/module/combat";
import { Animator } from "shared/components/animator.component";
import { ClientFunctions } from "shared/network";
import { Input, InputMode, InputResult, Motion } from "shared/util/input";

import Object from "@rbxts/object-utils";
import { CharacterSelectController } from "client/controllers/characterselect.controller";
import { OnKeyboardInput } from "client/controllers/keyboard.controller";
import { OnMatchRespawn } from "client/controllers/match.controller";
import Character from "shared/util/character";
import { CameraController2D } from "../camera/camera2d";

export abstract class CombatController2D extends CombatController implements OnKeyboardInput, OnMatchRespawn
{
    constructor(protected readonly motionInputController: MotionInput.MotionInputController, protected readonly cameraController2D: CameraController2D)
    {
        super();
    }

    protected keybindMap: Map<Enum.KeyCode, Input> = new Map();

    protected validateInput(attacks: Character.Character["Attacks"], input: (Motion | Input)[])
    {
        for (const [ _input ] of attacks)
        {
            if (_input.every((a, b) => input[b] === a))
                return true;
        }

        return false;
    }

    protected handleOffensiveInput(buttonPressed: Enum.KeyCode)
    {
        if (!this.IsEnabled())
            return false;

        const Characters = Dependency<CharacterSelectController>().characters;
        const buttonType = this.keybindMap.get(buttonPressed);
        if (!this.character)
            return InputResult.Fail;

        if (!this.selectedCharacter)
            return InputResult.Fail;

        assert(Characters.has(this.selectedCharacter.Name), "selected character does not exist");
        if (buttonType)
        {
            const characterAnimator = Dependency<Components>().getComponent(this.character, Animator.Animator);
            assert(characterAnimator, `no characterAnimator found in character ${this.character}`);

            const lockedMotionInput = this.motionInputController.pushToMotionInput(buttonType)!;
            const inputMotion = lockedMotionInput.GetInputsFilterNeutral();

            if (inputMotion.size() === 1)
            { // this likely means that it's a neutral input
                if (this.validateInput(Characters.get(this.selectedCharacter.Name)!.Attacks, lockedMotionInput.GetInputs()))
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

    public GetKeybinds()
    {
        return new ReadonlyMap(Object.entries(this.keybindMap));
    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        if (!this.IsEnabled())
            return false;

        const inProgressInputSize = this.motionInputController.getMotionInputInProgress()?.size() ?? 0;
        if (inProgressInputSize > 0 && inputMode !== InputMode.Release)
            return false;
        else if (inputMode !== InputMode.Press)
            return false;

        return this.handleOffensiveInput(buttonPressed);
    }
}
