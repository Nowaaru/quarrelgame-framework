import Make from "@rbxts/make";
import Roact from "@rbxts/roact";

import CharacterSelect from "client/ui/characterselect";

import { Controller, OnInit, OnStart } from "@flamework/core";
import { ClientFunctions } from "shared/network";
import { Character } from "shared/util/character";
import { Client } from "./client.controller";

@Controller({})
export class CharacterSelectController implements OnStart, OnInit
{
    private currentCharacterSelect?: Roact.Tree;

    private characterSelectConstructor?: Roact.Element;

    private characterSelectScreenGui: ScreenGui;

    private currentlySelectedCharacter?: Character.Character;

    private characters = new ReadonlyMap<string, Character.Character>();

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

    public SetCharacters(characters: ReadonlyMap<string, Character.Character>)
    {
        this.characters = characters;
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
