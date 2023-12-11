import { BaseComponent, Component, Components } from "@flamework/components";
import { Dependency, OnStart } from "@flamework/core";
import { HttpService, Workspace } from "@rbxts/services";
import { Entity } from "./entity.component";

import { MatchService } from "server/services/matchservice.service";
import type { QuarrelGame } from "server/services/quarrelgame.service";
import { EntityEvent } from "shared/components/entity.component";

export interface ParticipantAttributes
{
    ParticipantId: string;
    SelectedCharacter?: string;
    MatchId?: string;
}

interface CombatantLoader
{
    characterId?: string;
    matchId: string;
}

/**
 * A Participant inside of the game.
 */
@Component({
    defaults: {
        ParticipantId: HttpService.GenerateGUID(),
        MatchId: undefined,
    },
})
export class Participant extends BaseComponent<ParticipantAttributes, Player & { Character: defined; }>
{
    public readonly id: string = this.attributes.ParticipantId;

    private onEntityDied()
    {
        if (this.attributes.MatchId)
        {
            for (const match of Dependency<MatchService>().GetOngoingMatches())
            {
                if (match.GetParticipants().has(this))
                    return match.RespawnParticipant(this);
            }
        }

        return;
    }

    public setupDiedHandler()
    {
        // TODO: fix potential memory leak?
        this.entity?.RegisterEvent(EntityEvent.DEAD, () => this.onEntityDied());
    }

    public async SelectCharacter(characterId: string): Promise<boolean>
    {
        const characters = Dependency<QuarrelGame>().characters;

        assert(
            characters.has(characterId),
            `Character of ID ${characterId} does not exist.`,
        );
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
        const characters = Dependency<QuarrelGame>().characters;

        assert(
            characterId,
            "no character ID was provided, nor does the participant have a selected character.",
        );

        print("match id:", matchId);
        const thisMatch = [ ...Dependency<MatchService>().GetOngoingMatches() ].find(
            (match) => match.matchId === matchId,
        );
        if (thisMatch)
            this.instance.SetAttribute("MatchId", matchId);
        else
            error(`match of ID ${matchId} does not exist.`);

        return new Promise<Entity.PlayerCombatant<A>>((res) =>
        {
            assert(
                characters.has(characterId),
                `character of ID ${characterId} does not exist.`,
            );

            const newCharacter = characters.get(characterId)!;
            const newCharacterModel = newCharacter.Model.Clone();
            newCharacterModel.Parent = Workspace;
            print("character id:", characterId);
            newCharacterModel.SetAttribute("CharacterId", characterId);
            newCharacterModel.SetAttribute("MatchId", matchId);

            newCharacterModel.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None;
            newCharacterModel.Humanoid.HealthDisplayType = Enum.HumanoidHealthDisplayType.AlwaysOff;

            let _conn: RBXScriptConnection | void = this.instance.CharacterAdded.Connect((character) =>
            {
                if (character !== newCharacterModel)
                    return print(character, "!==", newCharacterModel);

                print(`character ${character.Name} is now the participant's character.`);
                _conn = _conn?.Disconnect();

                res(this.entity as never);
            });

            this.entity = Dependency<Components>().addComponent(
                newCharacterModel,
                Entity.PlayerCombatant,
            );

            this.instance.Character = newCharacterModel;
            this.character = this.instance.Character;

            this.setupDiedHandler();
            task.delay(2.5, () =>
            {
                if (_conn)
                    return _conn = _conn.Disconnect();
            });
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
                this.entity = Dependency<Components>().addComponent(
                    this.character,
                    Entity.Entity,
                );
                this.setupDiedHandler();

                return res(this.entity);
            });
        });
    }

    public character = this.instance.Character;

    public entity?:
        | Entity.Entity
        | Entity.PlayerCombatant<Entity.PlayerCombatantAttributes>;
}
