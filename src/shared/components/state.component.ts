import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
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
export class StateComponent<A extends StateAttributes, I extends Instance> extends BaseComponent<A, I> implements OnStart
{
    private defaultState?: AttributeValue;

    private stateGuards: Map<AttributeValue, () => void> = new Map();

    public readonly StateChanged = new Signal<(newState: AttributeValue) => void>();

    onStart()
    {
        print(`State Component for Instance ${Instance}.`);
    }

    public SetStateGuard(state: AttributeValue, guard: () => boolean | void)
    {
        if (this.stateGuards.has(state))

            warn(`StateGuard for state ${state} already exists (${guard}). Overwriting.`);

        this.stateGuards.set(state, guard);
    }

    public RemoveStateGuard(state: AttributeValue)
    {
        this.stateGuards.delete(state);
    }

    public SetState(state: AttributeValue)
    {
        if (state !== this.attributes.State)
        {
            this.attributes.State = state;
            this.StateChanged.Fire(this.GetState());
        }
    }

    public GetState()
    {
        return this.attributes.State;
    }

    public IsState(state: AttributeValue): boolean
    {
        return this.attributes.State === state;
    }

    public SetDefaultState(state: AttributeValue)
    {
        this.defaultState = state;
    }

    public ResetState()
    {
        if (this.defaultState !== undefined)

            this.SetState(this.defaultState);
    }

}