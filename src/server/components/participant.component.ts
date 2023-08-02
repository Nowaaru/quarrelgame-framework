import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Entity } from "./entity.component";
import { Physics } from "./physics";

interface Attributes {
    TestAttribute: 5
}

/**
 * A Participant inside of the game.
 */
@Component({
    defaults: {
    TestAttribute: 5
    }
    })
export class Participant extends BaseComponent<Attributes, Player> implements OnStart
{
    onStart()
    {
        const components = Dependency<Components>();
        this.instance.CharacterAdded.Connect((character) =>
        {
            this.character = character;
            this.entity = components.addComponent(character, Entity);
            components.addComponent(character, Physics.PhysicsEntity);
        });
    }

    public character = this.instance.Character;

    public entity?: Entity;
}