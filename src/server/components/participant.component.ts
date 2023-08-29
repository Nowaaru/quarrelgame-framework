import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Entity } from "./entity.component";
import { Physics } from "./physics";
import { HttpService, Workspace } from "@rbxts/services";

import Characters from "shared/data/character";
import { MatchService } from "server/services/matchservice.service";
import { ClientEvents, ServerEvents, ServerFunctions } from "shared/network";

export interface ParticipantAttributes {
    ParticipantId: string,
    SelectedCharacter?: string,
    MatchId?: string,
}

interface CombatantLoader {
    characterId?: string,
    matchId: string,
}

/**
 * A Participant inside of the game.
 */
@Component({
    defaults: {
        ParticipantId: HttpService.GenerateGUID(), 
        MatchId: undefined,
    }
})
export class Participant extends BaseComponent<ParticipantAttributes, Player & { Character: defined }>
{
    public readonly id: string = this.attributes.ParticipantId

    private onEntityDied()
    {
        if (this.attributes.MatchId)
        {
            for (const match of Dependency<MatchService>().GetOngoingMatches())

                if (match.GetParticipants().has(this))

                    return match.RespawnParticipant(this);
        }

        return;
    }

    public setupDiedHandler()
    {
        this.entity?.Died.Once(() => this.onEntityDied());
    }

    public async SelectCharacter(characterId: string): Promise<boolean>
    {
        assert(Characters.has(characterId), `Character of ID ${characterId} does not exist.`);
        this.instance.SetAttribute("SelectedCharacter", characterId);

        return true;
    }

    /**
     * Loads the Participant's combatant.
     * 📝 This is generally used for battles.
     * 
     * @param characterId The ID of the character that the Participant will spawn as.
     * @returns A promise that resolves when the character has been loaded.
     */
    public async LoadCombatant<A extends Entity.PlayerCombatantAttributes = Entity.PlayerCombatantAttributes>({
        characterId = this.instance.GetAttribute("SelectedCharacter") as string,
        matchId = this.instance.GetAttribute("MatchId") as string,
    }: CombatantLoader)
    {
        assert(characterId, "no character ID was provided, nor does the participant have a selected character.")
        if ([...Dependency<MatchService>().GetOngoingMatches()].some((match) => match.matchId === matchId))

            this.instance.SetAttribute("MatchId", matchId);

        return new Promise<Entity.PlayerCombatant<A>>((res) =>
        {
            assert(Characters.has(characterId), `character of ID ${characterId} does not exist.`);

            const newCharacter = Characters.get(characterId)!;
            const newCharacterModel = newCharacter.Model.Clone();
            newCharacterModel.Parent = Workspace;
            newCharacterModel.SetAttribute("CharacterId", characterId);
            newCharacterModel.SetAttribute("MatchId", matchId);

            newCharacterModel.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
            newCharacterModel.Humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff;

            if (this.character)

                newCharacterModel.PivotTo(this.character.GetPivot());

            this.instance.Character = newCharacterModel;
            this.character = this.instance.Character;

            this.entity = Dependency<Components>().addComponent(this.character, Entity.PlayerCombatant);
            this.setupDiedHandler()

            return res(this.entity as never);
        });
    }

    /**
     * Loads the Participant's online character.
     *
     * 📝 This generally is used for social features.
     */
    public async LoadCharacter()
    {
        return new Promise<Entity.Entity>((res) =>
        {
            this.instance.LoadCharacter();

            this.instance.CharacterAppearanceLoaded.Once((char) =>
            {
                this.character = char;
                this.entity = Dependency<Components>().addComponent(this.character, Entity.Entity);
                this.setupDiedHandler()

                return res(this.entity);
            });
        });
    }

    public character = this.instance.Character;

    public entity?: Entity.Entity | Entity.PlayerCombatant<Entity.PlayerCombatantAttributes>;
}