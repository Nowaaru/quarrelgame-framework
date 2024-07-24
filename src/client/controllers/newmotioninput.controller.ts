import { Dependency, Modding, OnRender, OnStart } from "@flamework/core";
import { Keyboard, OnKeyboardInput } from "./keyboard.controller";
import { Client } from "./client.controller";
import { CharacterController } from "client/module/character";
import { ClientFunctions } from "shared/network";
import { NullifyYComponent } from "shared/util/lib";

import * as input from "shared/util/input";
export import Input = input.Input;
export import Motion = input.Motion;

export interface MotionInputHandling
{
    onMotionInputChanged?(motionInput: input.MotionInput): void;
    onMotionInputTimeout?(motionInput: input.MotionInput): void;
}

/*
 * Motion Input Purge Mode.
 */
enum MotionInputPurgeMode 
{
    /*
     * Every timeout, remove
     * every item in the input
     * sequence.
     */
    ALL,
    /* 
     * Every timeout, remove
     * the earliest entry
     * in the input sequence.
     */
    TAIL
}

export class NewMotionInputController<T extends CharacterController> implements OnStart, OnRender, OnKeyboardInput
{
    public static PurgeMode: MotionInputPurgeMode = MotionInputPurgeMode.TAIL;

    protected readonly currentMotion: Array<Motion | Input> = [];

    protected readonly normalMap: ReadonlyMap<Enum.KeyCode, Enum.NormalId>;

    protected readonly motionInputEventHandlers: Set<MotionInputHandling> = new Set();

    constructor(protected characterController: T)
    {
        this.normalMap = this.characterController.GetKeybinds();
    }

    onKeyboardInput(buttonPressed: Enum.KeyCode, inputMode: input.InputMode): boolean | input.InputResult | (() => boolean | input.InputResult) 
    {
        print("motion guh 1", inputMode, input.InputMode.Release)
        if (this.currentMotion.size() <= 0)

            if (inputMode !== input.InputMode.Release) 

                return input.InputResult.Fail;

        else if (inputMode === input.InputMode.Release)

                return input.InputResult.Fail;

        print("motion guh 2", inputMode, input.InputMode.Release)
        const motionNormal = this.characterController.GetKeybinds().get(buttonPressed);
        const normalVector = motionNormal ? Vector3.FromNormalId(motionNormal) : Vector3.zero;
        this.currentMotion.push(Motion[input.ConvertMoveDirectionToMotion(normalVector)[0]]);

        const currentMotion = [ ... this.currentMotion ];
        for (const listener of this.motionInputEventHandlers)
        
            task.defer(() => listener.onMotionInputChanged?.(currentMotion));

        return input.InputResult.Success;
    }

    public SubmitMotionInput(): Promise<boolean>
    {
        const currentMotion = [ ...this.currentMotion ];
        return ClientFunctions.SubmitMotionInput([... currentMotion ]);
    }

    onStart(): void 
    {
        Modding.onListenerAdded<MotionInputHandling>((listener) => this.motionInputEventHandlers.add(listener));
        Modding.onListenerRemoved<MotionInputHandling>((listener) => this.motionInputEventHandlers.delete(listener));
    }

    private timeoutDeltaTime: number = 0;
    private motionInputTimeoutMaximum: number = 2;
    onRender(dt: number): void
    {
        if (this.timeoutDeltaTime >= this.motionInputTimeoutMaximum)
        {
            const currentMotion = [ ... this.currentMotion ];
            for (const listener of this.motionInputEventHandlers)
            { 
                task.defer(() => listener.onMotionInputTimeout?.(currentMotion));
                task.defer(() => listener.onMotionInputChanged?.(currentMotion));
            }

            switch (NewMotionInputController.PurgeMode)
            {
                case (MotionInputPurgeMode.TAIL):
                    this.currentMotion.shift();
                    break;

                default:
                    this.currentMotion.clear();
            }

            this.timeoutDeltaTime = 0;
            return;
        }

        if (this.currentMotion.size() > 0) 

            this.timeoutDeltaTime += dt;

        else this.timeoutDeltaTime = 0;
    }

    public GetMotionDirection(relativeTo: CFrame)
    {
        assert(this.characterController, "no character controller bound.");
        const keyboardDirectionMap = this.characterController.GetKeybinds();
        const keyboard = Dependency<Keyboard>();

        let totalVector = Vector3.zero;

        keyboardDirectionMap.forEach((normal, code) =>
        {
            if (keyboard.isKeyDown(code))
            {
                const { Top, Bottom, Back: Left, Front: Right } = Enum.NormalId;
                const { character } = Dependency<Client>();
                if (character)
                {
                    const { LookVector } = character.GetPivot();
                    const facingUnit = NullifyYComponent(LookVector).Dot(NullifyYComponent(relativeTo.Position).Unit);
                    const isFacingAway = facingUnit < 0;

                    if (isFacingAway && ([ Left, Right ] as Enum.NormalId[]).includes(normal))
                    {
                        switch ( normal )
                        {
                            case Left:
                                normal = Right;
                                break;

                            case Right:
                                normal = Left;
                                break;
                        }
                    }

                    if (character.GetPivot().Y < relativeTo.Y && [ Top, Bottom ] as EnumItem[])
                    {
                        switch ( normal )
                        {
                            case Top:
                                normal = Bottom;
                                break;

                            case Bottom:
                                normal = Top;
                                break;
                        }
                    }
                }

                if (relativeTo)
                {
                    totalVector = totalVector.add(
                        input.GenerateRelativeVectorFromNormalId(relativeTo, normal),
                    );
                }
                else
                {
                    totalVector = totalVector.add(Vector3.FromNormalId(normal));
                }
            }
        });

        return totalVector.Magnitude > 0 ? totalVector.Unit : totalVector;
    }
}
