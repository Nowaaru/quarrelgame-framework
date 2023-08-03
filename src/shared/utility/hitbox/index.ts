import RaycastHitbox, { HitboxObject } from "@rbxts/raycast-hitbox";
import { HttpService } from "@rbxts/services";
import { $env } from "rbxts-transform-env";

type Frames = number;
export namespace Hitbox {
    export class HitboxBuilder
    {
        private readonly defaultSize = new Vector3(4,4,4);

        private readonly hitboxId = HttpService.GenerateGUID(false);

        private size: Vector3 = this.defaultSize;

        private disjointOffset: Vector3 = Vector3.zero;

        private frameDuration?: Frames;

        /**
         * Set the size of the hitbox.
         * @param size The size of the hitbox.
         */
        public SetSize(size = this.defaultSize)
        {
            this.size = size;

            return this;
        }

        /**
         * Set the offset of the Hitbox.
         * @param offset The offset of the hitbox.
         */
        public SetOffset(offset = Vector3.zero)
        {
            this.disjointOffset = offset;

            return this;
        }

        public SetDuration(frames?: Frames)
        {
            this.frameDuration = frames;

            return this;
        }

        private Compile(): HitboxProps
        {
            const { disjointOffset, frameDuration, size, hitboxId } = this;

            return {
                hitboxId,
                disjointOffset,
                frameDuration,
                size
            };
        }

        public Construct()
        {
            return new Hitbox(this.Compile());
        }
    }

    interface HitboxProps {
        size: Vector3;
        disjointOffset: Vector3;
        frameDuration?: number;
        hitboxId: string;
    }

    export class Hitbox
    {
        public readonly size;

        public readonly hitboxId;

        public readonly disjointOffset;

        /**
         * A hitbox instance.
         */
        constructor({
            size,
            disjointOffset,
            hitboxId,
        }: HitboxProps)
        {
            this.disjointOffset = disjointOffset;
            this.size = size;
            this.hitboxId = hitboxId;
        }

        public Initialize(target: BasePart | Bone)
        {
            return new ActiveHitbox(this, target);
        }
    }

    export class ActiveHitbox
    {
        private readonly hitbox: Omit<Hitbox, "Initialize">;

        private readonly raycastHitbox: HitboxObject;

        constructor(hitbox: Hitbox, private readonly target: BasePart | Bone)
        {
            this.hitbox = hitbox;

            this.raycastHitbox = new RaycastHitbox(target);

            this.raycastHitbox.Visualizer = $env.boolean("DEBUG_VISUALIZER");

            const {size, disjointOffset} = hitbox;
            this.raycastHitbox.SetPoints(target, []);
        }

        public Join()
        {

        }


    }

}