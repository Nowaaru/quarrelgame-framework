import { BaseComponent, Component } from "@flamework/components";
import { Controller, Dependency, OnInit, OnStart } from "@flamework/core";
import Make from "@rbxts/make";

import { Animation } from "shared/util/character";
import { HttpService, RunService } from "@rbxts/services";
import { ClientFunctions } from "shared/network";

import type { SchedulerService }  from "server/services/scheduler.service";
import Signal from "@rbxts/signal";
import { StateAttributes } from "./state.component";
import Gio from "shared/data/character/gio";
import { EntityState, GetTickRate } from "shared/util/lib";

export namespace Animator {
    interface PlayOptions {
        Speed?: number,
        Preload?: boolean,
        FadeTime?: number,

    }

    export class Animation
    {
        private readonly Animation: Instances["Animation"];

        private readonly AnimationTrack: Instances["AnimationTrack"];

        private readonly Name;

        private readonly Id;

        private GameLength = 0;

        public readonly Priority: Enum.AnimationPriority;

        public readonly AnimationId: string;

        public Ended: Signal<() => void> = new Signal();

        constructor(private readonly animator: Animator, {assetId, priority, name, loop}: Animation.AnimationData)
        {
            this.Animation = Make("Animation", {
                AnimationId: assetId,
                Name: name,
            });

            this.Name = name;
            this.Id = `${this.Name}-${HttpService.GenerateGUID(false)}`;

            this.AnimationTrack = animator.GetAnimator().LoadAnimation(this.Animation);
            this.AnimationTrack.Priority = priority ?? Enum.AnimationPriority.Action;
            this.AnimationTrack.Looped = loop ?? false;

            this.Priority = this.AnimationTrack.Priority;
            this.AnimationId = this.Animation.AnimationId;

            this.AnimationTrack.Ended.Connect(() =>
            {
                if (animator.attributes.ActiveAnimation === this.Id)

                    animator.attributes.ActiveAnimation = undefined;

                this.Ended.Fire();
            });

            const tickRate = GetTickRate();

            this.Loaded = new Promise<void>((res) =>
            {
                while (!this.AnimationTrack)

                    task.wait();

                if (this.AnimationTrack.Length > 0 ?? this.AnimationTrack.IsPropertyModified("Length"))

                    return res();

                do
                    this.AnimationTrack.GetPropertyChangedSignal("Length").Wait();
                while (this.AnimationTrack.Length === 0);

                if (tickRate)

                    this.GameLength = tickRate * this.AnimationTrack.Length;

                return res();
            });

        }

        public IsPlaying()
        {
            return this.AnimationTrack.IsPlaying;
        }

        public IsLoaded()
        {
            if (this.AnimationTrack.IsPropertyModified("Length"))

                return true;

            return false;
        }

        public readonly Loaded;

        public async Play(playOptions?: PlayOptions): Promise<this>
        {
            return new Promise((res) =>
            {
                if (playOptions?.Preload)
                {
                    return this.Loaded.then(() =>
                    {
                        this.animator.attributes.ActiveAnimation = this.Id;
                        this.AnimationTrack.Play();

                        return res(this);
                    });
                }

                this.animator.attributes.ActiveAnimation = this.Id;
                this.AnimationTrack.Play(playOptions?.FadeTime, undefined, playOptions?.Speed);

                return res(this);
            });
        }

        public async Stop({fadeTime, yieldFade}: {fadeTime?: number, yieldFade?: boolean}): Promise<this>
        {
            if (this.animator.attributes.ActiveAnimation === this.Id)

                this.animator.attributes.ActiveAnimation = undefined;

            this.AnimationTrack.Stop(fadeTime);
            if (yieldFade)

                task.wait(fadeTime);

            return this;
        }
    }

    interface AnimatorProps {
        ActiveAnimation?: string
    }

    @Component({})
    export class Animator<I extends AnimatorProps = AnimatorProps> extends BaseComponent<I, Model & { Humanoid: Humanoid & { Parent: Model, Animator: Instances["Animator"] & { Parent: Humanoid } }}>
    {
        public LoadAnimation(animation: Animation.AnimationData): Animation
        {
            return new Animation(this, animation);
        }

        public GetAnimator()
        {
            return this.Animator;
        }

        private readonly Animator = this.instance.Humanoid.Animator as unknown as Instances["Animator"] & { Parent: Humanoid & { Animator: Instances["Animator"] & { Parent: Humanoid }, Parent: Model } };
    }

    interface StateAnimatorProps extends AnimatorProps, StateAttributes {

    }

    @Component({})
    export class StateAnimator extends Animator<StateAnimatorProps> implements OnStart
    {
        private currentLoadedAnimation?: Animation

        onStart(): void
        {
            while (!this.instance.Parent)

                task.wait();

            this.GetAnimator()
                .GetPlayingAnimationTracks()
                .forEach((a) => a.Stop(0));

            this.onStateChanged(EntityState.Idle);
            this.onAttributeChanged("State", (newState, oldState) => this.onStateChanged(newState));
        }

        private onStateChanged(newState: AttributeValue)
        {
            if (typeIs(newState, "number"))
            {
                if (newState in Gio.Animations)
                {
                    const newLoadedAnimation = this.LoadAnimation(Gio.Animations[ newState as keyof typeof Gio.Animations ]!);
                    let animationWasInterrupted = false;
                    if (this.currentLoadedAnimation)
                    {
                        if (newLoadedAnimation.Priority.Value >= this.currentLoadedAnimation.Priority.Value)
                        {
                            if (newLoadedAnimation.AnimationId !== this.currentLoadedAnimation.AnimationId)
                            {
                                animationWasInterrupted = true;
                                this.currentLoadedAnimation.Stop({fadeTime: 0});
                            }
                        }

                        if (
                            newLoadedAnimation.Priority === Enum.AnimationPriority.Idle
                                && this.currentLoadedAnimation.Priority === Enum.AnimationPriority.Movement)
                        {
                            animationWasInterrupted = true;
                            this.currentLoadedAnimation.Stop({fadeTime: 0.25});
                        }
                    }

                    if (newLoadedAnimation.AnimationId !== this.currentLoadedAnimation?.AnimationId)
                    {
                        this.currentLoadedAnimation = newLoadedAnimation;
                        this.currentLoadedAnimation.Play({
                            FadeTime: newState === EntityState.Idle && animationWasInterrupted ? 0.125 : undefined,
                        });
                    }
                }

            }
        }


    }
}