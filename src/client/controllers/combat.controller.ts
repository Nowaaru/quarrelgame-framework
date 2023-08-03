import { Controller, OnStart, OnInit, Dependency } from "@flamework/core";
import { OnKeyboardInput } from "./keyboard.controller";
import { Input, InputMode, InputResult } from "shared/utility/input";
import { Client } from "./client.controller";
import { Components } from "@flamework/components";
import { Animator } from "../../shared/components/animator.component";
import gio from "shared/data/character/gio";
import { ClientFunctions, ServerFunctions } from "shared/network";

@Controller({})
export class CombatController implements OnStart, OnInit, OnKeyboardInput
{
    constructor(private readonly client: Client)
    {}

    onInit()
    {

    }

    private keybindMap = new Map<Enum.KeyCode, Input>([
        [Enum.KeyCode.F, Input.Slash]
    ])

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: InputMode): boolean | InputResult | (() => boolean | InputResult)
    {
        if (inputMode === InputMode.Release)

            return InputResult.Fail;

        const buttonType = this.keybindMap.get(buttonPressed);
        const character = this.client.player.Character;
        if (!character)

            return InputResult.Fail;


        if (buttonType)
        {
            switch (buttonType)
            {
                case Input.Slash:
                {
                    const characterAnimator = Dependency<Components>().getComponent(character, Animator.Animator);
                    assert(characterAnimator, `no characterAnimator found in character ${character}`);

                    if (gio.Attacks.S)

                        ClientFunctions[ Input.Slash ].invoke();

                    break;
                }
            }
        }

        return InputResult.Fail;
    }

    onStart()
    {

    }
}