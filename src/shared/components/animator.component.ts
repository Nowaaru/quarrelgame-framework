import { BaseComponent, Component } from "@flamework/components";
import { OnStart } from "@flamework/core";

import { HttpService } from "@rbxts/services";
import { StateAttributes } from "./state.component";
import { EntityState, GetTickRate } from "shared/util/lib";
import { Animation } from "shared/util/animation";

import Make from "@rbxts/make";
import Signal from "@rbxts/signal";
import Characters from "shared/data/character";
export namespace Animator {
    interface PlayOptions {
        Speed?: number,
        Preload?: boolean,
        FadeTime?: number,
        Weight?: number
    }

    export class Animation
    {
        public readonly Animation: Instances["Animation"];

        public readonly AnimationTrack: Instances["AnimationTrack"];

        public readonly AnimationData: Animation.AnimationData;

        public readonly IsAttackAnimation;

        private readonly Name;

        private readonly Id;

        private GameLength = 0;

        public readonly Priority: Enum.AnimationPriority;

        public readonly AnimationId: string;

        public Ended: Signal<() => void> = new Signal();

        constructor(private readonly animator: Animator, animationData: Animation.AnimationData)
        {
            const {assetId, priority, name, loop} = animationData;
            this.Animation = Make("Animation", {
                AnimationId: assetId,
                Name: name,
            });

            this.AnimationData = animationData;

            this.Name = name;
            this.Id = `${this.Name}-${HttpService.GenerateGUID(false)}`;

            this.AnimationTrack = animator.GetAnimator().LoadAnimation(this.Animation);
            this.AnimationTrack.Priority = priority ?? Enum.AnimationPriority.Action;
            this.AnimationTrack.Looped = loop ?? false;

            this.Priority = this.AnimationTrack.Priority;
            this.AnimationId = this.Animation.AnimationId;
            this.IsAttackAnimation = this.AnimationData.isAttackAnimation;

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

        public IsPaused()
        {
            return this.AnimationTrack.Speed === 0 && this.IsPlaying();
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
                        this.AnimationTrack.Play(playOptions?.FadeTime, playOptions?.Weight, playOptions?.Speed ?? 1);

                        return res(this);
                    });
                }

                this.animator.attributes.ActiveAnimation = this.Id;
                this.AnimationTrack.Play(playOptions?.FadeTime, playOptions?.Weight, playOptions?.Speed ?? 1);

                return res(this);
            });
        }

        public async Pause(): Promise<this>
        {
            this.AnimationTrack?.AdjustSpeed(0);

            return this;
        }

        public async Resume(): Promise<this>
        {
            this.AnimationTrack?.AdjustSpeed(1);

            return this;
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
        protected loadedAnimations: Animation[] = [];

        public LoadAnimation(animation: Animation.AnimationData): Animation
        {
            const loadedAnimation = new Animation(this, animation);
            this.loadedAnimations.push(loadedAnimation);

            return loadedAnimation;
        }

        public GetPlayingAnimations(): Animation[]
        {
            return this.Animator.GetPlayingAnimationTracks().mapFiltered((n) =>
            {
                return this.loadedAnimations.find((x) => x.AnimationId === n.Animation?.AnimationId);
            });
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

        private async onStateChanged(newState: AttributeValue)
        {
            const Gio = Characters.get("Giovanna?")!;
            if (this.paused)

                return;

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

        private pausedState?: AttributeValue;
        public Pause(paused = true)
        {
            if (!paused)
            {
                this.Unpaused.Fire();
                if (this.currentLoadedAnimation?.IsPaused())

                    this.currentLoadedAnimation?.Resume();

                if (this.attributes.State !== this.pausedState)

                    this.onStateChanged(this.attributes.State);
            }
            else
            {
                this.paused = true;
                this.currentLoadedAnimation?.Pause();
            }
        }

        public Unpause()
        {
            return this.Pause(false);
        }

        private paused = false;

        private Unpaused: Signal<() => void> = new Signal();
    }
}