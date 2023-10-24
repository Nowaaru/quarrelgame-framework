import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { EntityState } from "shared/util/lib";

import Signal from "@rbxts/signal";

interface StateGuard
{
}
export interface StateAttributes
{
    /**
     * The current State.
     */
    State: AttributeValue;
}

@Component({})
export class StatefulComponent<A extends StateAttributes, I extends Instance> extends BaseComponent<A, I> implements OnStart
{
    private defaultState?: EntityState;

    private stateGuards: Map<EntityState, () => void> = new Map();

    private stateEffects: Map<EntityState, (oldState: EntityState) => void> = new Map();

    public readonly StateChanged = new Signal<(oldState: EntityState, newState: EntityState, wasForced?: boolean) => void>();

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

    private doStateFunctions(state: EntityState, force = false)
    {
        this.StateChanged.Fire(this.GetState(), state, force);
        this.attributes.State = state;

        task.spawn(() => this.stateEffects.get(state)?.(this.GetState()));
    }

    public SetState(state: EntityState): boolean
    {
        if (state !== this.attributes.State)
        {
            if (this.stateGuards.has(state))
            {
                if (!this.stateGuards.get(state)?.())
                {
                    print(`State guard failed: ${EntityState[state]}`);

                    return false;
                }
            }

            this.ForceState(state);
            return true;
        }

        return false;
    }
    public ForceState(state: EntityState): void
    {
        this.doStateFunctions(state, true);
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
