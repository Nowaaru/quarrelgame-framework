import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Entity } from "./entity.component";
import { Physics } from "./physics";
import { HttpService, Workspace } from "@rbxts/services";

import Characters from "shared/data/character";
import { CharacterRigType } from "data/models/character";

interface ParticipantAttributes {
    ParticipantId: string,
    SelectedCharacter?: string,
}

/**
 * A Participant inside of the game.
 */
@Component({
    defaults: {
    ParticipantId: HttpService.GenerateGUID()
    }
    })
export class Participant extends BaseComponent<ParticipantAttributes, Player & { Character: defined }> implements OnStart
{
    public readonly id: string = this.attributes.ParticipantId

    onStart()
    {
        const components = Dependency<Components>();
        this.instance.CharacterAdded.Connect((character) =>
        {
            this.character = character;
            const entityComponent = this.entity = components.addComponent(character, Entity.PlayerCombatant);
            const entityRotator = components.addComponent(character, Entity.EntityRotator);
            const physicsEntity = components.addComponent(character, Physics.PhysicsEntity);

            entityRotator.RotateTowards((Workspace.WaitForChild("jane") as Model).PrimaryPart!);
        });
    }

    public async LoadCharacter(characterId: string)
    {
        return new Promise<boolean>((res) =>
        {
            assert(Characters.has(characterId), `Character of ID ${characterId} does not exist.`);

            const newCharacter = Characters.get(characterId)!;
            const newCharacterModel = newCharacter.Model.Clone();
            newCharacterModel.Parent = Workspace;
            newCharacterModel.SetAttribute("CharacterId", characterId);

            newCharacterModel.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
            newCharacterModel.Humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff;

            if (this.character)

                newCharacterModel.PivotTo(this.character.GetPivot());

            this.instance.SetAttribute("SelectedCharacter", characterId);
            this.instance.Character = newCharacterModel;
            this.character = this.instance.Character;

            return res(true);
        });
    }

    public character = this.instance.Character;

    public entity?: Entity.PlayerCombatant<Entity.PlayerCombatantAttributes>;
}