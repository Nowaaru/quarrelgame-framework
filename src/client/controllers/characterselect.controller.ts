import Roact from "@rbxts/roact";
import Make from "@rbxts/make";

import CharacterSelect from "client/ui/characterselect";

import { Controller, OnStart, OnInit } from "@flamework/core";
import { Client } from "./client.controller";
import Characters from "shared/data/character";
import { Character } from "shared/util/character";
import { ClientFunctions } from "shared/network";

@Controller({})
export class CharacterSelectController implements OnStart, OnInit
{
    private currentCharacterSelect?: Roact.Tree;

    private characterSelectScreenGui: ScreenGui;

    private currentlySelectedCharacter?: Character.Character;

    constructor(private readonly client: Client)
    {
        this.characterSelectScreenGui = Make("ScreenGui", {
            Parent: this.client.player.PlayerGui,
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
        if (!this.client.player.GetAttribute("SelectedCharacter"))

            this.OpenCharacterSelect();
    }

    public OpenCharacterSelect()
    {
        if (!this.currentCharacterSelect)

        {
            this.currentCharacterSelect = Roact.mount(Roact.createElement(CharacterSelect, {
                Characters,
                OnSelect: (selectedCharacter: Character.Character) =>
                {
                    print("eeeeeeeeeeeeeeeeeeeeeee", selectedCharacter, this.currentlySelectedCharacter);
                    if (this.currentlySelectedCharacter && selectedCharacter === this.currentlySelectedCharacter)
                    {
                        print("Selected Character:", selectedCharacter);
                        ClientFunctions.RespawnCharacter(selectedCharacter.Name);
                        this.client.player.SetAttribute("SelectedCharacter", selectedCharacter.Name);
                        this.CloseCharacterSelect();
                    }
                    else this.currentlySelectedCharacter = selectedCharacter;
                },
            }), this.characterSelectScreenGui, "CharacterSelect");
        }
    }

    public CloseCharacterSelect()
    {
        if (this.currentCharacterSelect !== undefined)

            Roact.unmount(this.currentCharacterSelect);

        print("closed character select");
    }
}