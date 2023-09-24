import { Players } from "@rbxts/services";
import { OnRespawn } from "client/controllers/client.controller";
import { Character } from "shared/util/character";

import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import { Animator } from "shared/components/animator.component";
import Characters from "shared/data/character";
import { Input, InputMode, InputResult } from "shared/util/input";

export abstract class CombatController implements OnRespawn
{
    protected selectedCharacter?: Character.Character;

    protected lockOnTarget?: Instance & { Position: Vector3; };

    protected character?: Model;

    // TODO: implement a way to automatically register
    // keybinds through a json file in the project
    // created using the framework
    // ***********************************************
    // so that means *don't* try to do it within the
    // framework itself lol

    protected abstract keybindMap: Map<Enum.KeyCode, Input>;

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

    constructor()
    {}
}
