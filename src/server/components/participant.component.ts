import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Entity } from "./entity.component";
import { Physics } from "./physics";
import { HttpService, Workspace } from "@rbxts/services";

interface ParticipantAttributes {
    participantId: string,
}

/**
 * A Participant inside of the game.
 */
@Component({
    defaults: {
    participantId: HttpService.GenerateGUID()
    }
    })
export class Participant extends BaseComponent<ParticipantAttributes, Player> implements OnStart
{
    public readonly id: string = this.attributes.participantId

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

    public character = this.instance.Character;

    public entity?: Entity.PlayerCombatant<Entity.PlayerCombatantAttributes>;
}