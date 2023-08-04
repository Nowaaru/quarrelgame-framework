import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Entity } from "./entity.component";
import { Physics } from "./physics";
import { HttpService } from "@rbxts/services";

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
            this.entity = components.addComponent(character, Entity.Entity);
            components.addComponent(character, Physics.PhysicsEntity);
        });
    }

    public character = this.instance.Character;

    public entity?: Entity.Entity;
}