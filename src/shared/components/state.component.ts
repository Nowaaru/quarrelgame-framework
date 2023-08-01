import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";

export interface StateAttributes {
    State: AttributeValue,
}


@Component({})
export class StateComponent<A extends StateAttributes, I extends Instance> extends BaseComponent<A, I> implements OnStart
{
    private defaultState?: AttributeValue;

    onStart()
    {
        print(`State Component for Instance ${Instance}.`);
    }

    public SetState(state: AttributeValue)
    {
        this.attributes.State = state;
    }

    public GetState()
    {
        return this.attributes.State;
    }

    public IsState(state: AttributeValue): this is StateComponent<A,I> & { attributes: { State: typeof state }, GetState(): typeof state }
    {
        return this.attributes.State === state || undefined as unknown as boolean; // ???????????????????????
    }

    public SetDefaultState(state: AttributeValue)
    {
        this.defaultState = state;
    }

    public ResetState()
    {
        if (this.defaultState)

            this.SetState(this.defaultState);
    }

}