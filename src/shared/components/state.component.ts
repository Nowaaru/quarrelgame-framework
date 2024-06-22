import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { EntityState } from "shared/util/lib";

import Signal from "@rbxts/signal";

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
        task.spawn(() => {

            this.StateChanged.Fire(this.GetState(), state, force);
            this.attributes.State = state;
            this.stateEffects.get(state)?.(state);
        });
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

    public IsDefaultState(): boolean
    {
        assert(this.defaultState !== undefined, `default state is undefined for instance ${this.instance.Name}`);
        return this.attributes.State === this.defaultState
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

    public WhileInState(time: number | undefined): Promise<void>
    {
        return new Promise((res, rej) => {
            let state: 0 | 1 = 0;
            let r: RBXScriptConnection | void = this.StateChanged.Once((_, new_state) =>
            {
                if (state === 0)
                {
                    state = 1;
                    rej(new_state);
                }

                r = r?.Disconnect();
            })

            task.delay(time ?? 0, () => {
                if (state === 0)
                {
                    state = 1;
                    res();
                }

                r = r?.Disconnect();
            });
        })
    }
}
