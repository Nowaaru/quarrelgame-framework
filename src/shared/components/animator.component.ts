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
    interface AnimatorProps {
        ActiveAnimation?: string
    }

    @Component({})
    export class Animator<I extends AnimatorProps = AnimatorProps> extends BaseComponent<I, Model & { Humanoid: Humanoid & { Parent: Model, Animator: Instances["Animator"] & { Parent: Humanoid } }}>
    {
        protected loadedAnimations: Animation.Animation[] = [];

        public LoadAnimation(animation: Animation.AnimationData): Animation.Animation
        {
            const loadedAnimation = new Animation.Animation(this, animation);
            this.loadedAnimations.push(loadedAnimation);

            return loadedAnimation;
        }

        public GetPlayingAnimations(): Animation.Animation[]
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
        private currentLoadedAnimation?: Animation.Animation

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
            const Gio = Characters.get("Vannagio")!;
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