import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent, Components } from "@flamework/components";
import { Entity } from "./entity.component";
import { PhysicsEntity } from "./physicsentity.component";

interface Attributes {}

@Component({})
export class Participant extends BaseComponent<Attributes, Player> implements OnStart
{
    onStart()
    {
        const components = Dependency<Components>();
        this.instance.CharacterAdded.Connect((character) =>
        {
            this.character = character;
            this.entity = components.addComponent(character, Entity);
            components.addComponent(character, PhysicsEntity);
        });
    }

    public character = this.instance.Character;

    public entity?: Entity;
}