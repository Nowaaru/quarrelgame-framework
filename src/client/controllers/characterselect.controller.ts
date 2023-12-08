import Make from "@rbxts/make";
import Roact from "@rbxts/roact";

import CharacterSelect from "client/ui/characterselect";

import { Controller, OnInit, OnStart } from "@flamework/core";
import { Players } from "@rbxts/services";
import { ClientFunctions } from "shared/network";
import { Character } from "shared/util/character";
import { Client } from "./client.controller";

/*
 * The controller responsible for handling character selection
 * and attributing the selected character to the Client.
 *
 * Has a priority of 1.
 */
@Controller({
    loadOrder: 1,
})
export class CharacterSelectController implements OnStart, OnInit
{
    private currentCharacterSelect?: Roact.Tree;

    private characterSelectConstructor?: Roact.Element;

    private characterSelectScreenGui: ScreenGui;

    private currentlySelectedCharacter?: Character.Character;

    public readonly characters = new Map<string, Character.Character>();

    constructor()
    {
        this.characterSelectScreenGui = Make("ScreenGui", {
            Parent: Players.LocalPlayer.WaitForChild("PlayerGui"),
            IgnoreGuiInset: true,
            ResetOnSpawn: false,
            ZIndexBehavior: Enum.ZIndexBehavior.Sibling,
        });
    }

    onInit()
    {
    }

    onStart()
    {
        if (!Players.LocalPlayer.GetAttribute("SelectedCharacter"))
            this.OpenCharacterSelect();
    }

    public SetCharacters(characters: ReadonlyMap<string, Character.Character>)
    {
        this.characters.clear();
        for (const [ charname, char ] of characters)
            this.characters.set(charname, char);
    }

    public BindCharacterSelectInstance()
    {
    }

    public OpenCharacterSelect()
    {
        if (!this.currentCharacterSelect)
        {
            this.currentCharacterSelect = Roact.mount(
                Roact.createElement(CharacterSelect, {
                    Characters: this.characters,
                    OnSelect: (selectedCharacter: Character.Character) =>
                    {
                        if (this.currentlySelectedCharacter && selectedCharacter === this.currentlySelectedCharacter)
                        {
                            ClientFunctions.RespawnCharacter(selectedCharacter.Name);
                            this.CloseCharacterSelect();
                        }
                        else
                        {
                            this.currentlySelectedCharacter = selectedCharacter;
                            ClientFunctions.SelectCharacter(selectedCharacter.Name);
                        }
                    },
                }),
                this.characterSelectScreenGui,
                "CharacterSelect",
            );
        }
    }

    public CloseCharacterSelect()
    {
        if (this.currentCharacterSelect !== undefined)
            Roact.unmount(this.currentCharacterSelect);

        print("closed character select");
    }
}
