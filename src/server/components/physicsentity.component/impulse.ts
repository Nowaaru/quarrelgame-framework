import { RunService, Workspace } from "@rbxts/services";
import type { PhysicsAttributes, PhysicsEntity } from ".";

export namespace Impulse {
    export class ConstantImpulse
    {
        private static Impulses = new Set<ConstantImpulse>();

        /**
         * Apply an Impulse to a PhysicsEntity.
         * @param target The PhysicsEntity to apply the impulse on.
         * @param direction The direction to push the PhysicsEntity.
         * @param velocity The speed of the impulse.
         */
        constructor(
            private readonly target: PhysicsEntity<PhysicsAttributes, Model & { PrimaryPart: BasePart }>,
            private readonly direction: Vector3,
            private velocity: number,
        )
        {
            this.SetVelocity(velocity);
            this.target.Deleted.Once(() =>
            {
                this.Stop();
            });
        }

        public SetVelocity(velocity: number)
        {
            this.velocity = velocity;
        }

        public Apply()
        {
            ConstantImpulse.Impulses.add(this);
            this.ImpulseEvent = RunService.PostSimulation.Connect((deltaPerStep) =>
            {
                return Promise.try(() =>
                {
                    const primaryPart = this.target.GetPrimaryPart();
                    const primaryCFrame = primaryPart.GetPivot();
                    primaryPart.PivotTo(primaryCFrame.add(this.direction.mul(this.velocity * deltaPerStep)));
                    primaryPart.Anchored = true;
                }).catch((e) =>
                {
                    warn(`An error occured within an impulse: \n${e}`);
                    this.Stop();
                });
            });
        }

        public Stop()
        {
            this.ImpulseEvent = this.ImpulseEvent?.Disconnect();
            ConstantImpulse.Impulses.delete(this);
        }

        public isEnabled()
        {
            return !!this.ImpulseEvent;
        }

        private ImpulseEvent?: RBXScriptConnection | void;
    }

    export class PhysicsImpulse
    {
        /**
         * A physics impulse applied using {@link BasePart.ApplyImpulse BasePart.ApplyImpulse()}.
         * Immutable.
         */
        constructor(
            private readonly target: PhysicsEntity<PhysicsAttributes, Model & { PrimaryPart: BasePart }>,
            private readonly direction: Vector3,
            private readonly velocity: number,
        )
        {}

        Apply()
        {
            this.target.GetPrimaryPart().ApplyImpulse(this.direction.mul(this.velocity));
        }
    }
}