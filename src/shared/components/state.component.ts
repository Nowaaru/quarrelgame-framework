import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { EntityState } from "shared/util/lib";

import Signal from "@rbxts/signal";

interface StateGuard {

}
export interface StateAttributes {
    /**
     * The current State.
     */
    State: AttributeValue,
}
@Component({})
export class StatefulComponent<A extends StateAttributes, I extends Instance> extends BaseComponent<A, I> implements OnStart
{
    private defaultState?: EntityState;

    private stateGuards: Map<EntityState, () => void> = new Map();

    private stateEffects: Map<EntityState, (oldState: EntityState) => void> = new Map();

    public readonly StateChanged = new Signal<(oldState: EntityState, newState: EntityState) => void>();

    onStart()
    {
        print(`State Component for Instance ${Instance}.`);
    }

    public GetStateEffect(state: EntityState): ((oldState: EntityState) => void) | undefined
    {
        return this.stateEffects.get(state);
    }

    public SetStateEffect(state: EntityState, effect: (oldState: EntityState) => void)
    {
        if (this.stateEffects.has(state))

            warn(`StateEffect for state ${state} already exists (${effect}). Overwriting.`);

        this.stateEffects.set(state, effect);
    }

    public SetStateGuard(state: EntityState, guard: () => boolean | void)
    {
        if (this.stateGuards.has(state))

            warn(`StateGuard for state ${state} already exists (${guard}). Overwriting.`);

        this.stateGuards.set(state, guard);
    }

    public RemoveStateGuard(state: EntityState)
    {
        this.stateGuards.delete(state);
    }

    public SetState(state: EntityState): boolean
    {
        if (state !== this.attributes.State)
        {
            if (this.stateGuards.has(state))
            {
                if (!this.stateGuards.get(state)?.())
                {
                    print(`State guard failed: ${EntityState[ state ]}`);

                    return false;
                }
            }

            this.StateChanged.Fire(this.GetState(), state);
            this.stateEffects.get(state)?.(this.GetState());
            this.attributes.State = state;

            return true;
        }

        return false;
    }

    public GetState(): EntityState
    {
        return this.attributes.State as EntityState;
    }

    public IsState(...states: AttributeValue[]): boolean
    {
        return states.includes(this.attributes.State);
    }

    public SetDefaultState(state: EntityState)
    {
        this.defaultState = state;
    }

    public ResetState()
    {
        if (this.defaultState !== undefined)

            this.SetState(this.defaultState);
    }

}