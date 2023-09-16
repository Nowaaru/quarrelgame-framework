import { Components } from "@flamework/components";
import { Dependency } from "@flamework/core";
import RaycastHitbox, { HitboxObject } from "@rbxts/raycast-hitbox";
import { HttpService, RunService, Workspace } from "@rbxts/services";
import { $env } from "rbxts-transform-env";
import { Skill } from "shared/util/character";

import Make from "@rbxts/make";
import Signal from "@rbxts/signal";
import type { CombatService } from "server/services/combat.service";
import type { QuarrelGame } from "server/services/quarrelgame.service";

import type { Entity } from "server/components/entity.component";
import type { OnHit } from "server/services/combat.service";
import * as lib from "shared/util/lib";

type Frames = number;
export namespace Hitbox
{
    export import HitResult = lib.HitResult;

    export class HitboxBuilder
    {
        private readonly defaultSize = new Vector3(4, 4, 4);

        private readonly hitboxId = HttpService.GenerateGUID(false);

        private size: Vector3 = this.defaultSize;

        private disjointOffset: Vector3 = Vector3.zero;

        private frameDuration?: Frames;

        private hitRegion = HitboxRegion.High;

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

        /**
         * Set where the hitbox will process contacts.
         * @param region The region that the hitbox will hit.
         */
        public SetRegion(region: HitboxRegion)
        {
            this.hitRegion = region;

            return this;
        }

        private Compile(): HitboxProps
        {
            const { disjointOffset, frameDuration, size, hitboxId, hitRegion } = this;

            return {
                hitboxId,
                disjointOffset,
                frameDuration,
                size,
                hitRegion,
            };
        }

        public Construct()
        {
            return new Hitbox(this.Compile());
        }
    }

    export import HitboxRegion = lib.HitboxRegion;
    interface HitboxProps
    {
        size: Vector3;
        disjointOffset: Vector3;
        frameDuration?: number;
        hitboxId: string;
        hitRegion: HitboxRegion;
    }

    export class Hitbox
    {
        public readonly size;

        public readonly hitboxId;

        public readonly disjointOffset;

        public readonly hitRegion;

        /**
         * A hitbox instance.
         */
        constructor({
            size,
            disjointOffset,
            hitboxId,
            hitRegion,
        }: HitboxProps)
        {
            this.disjointOffset = disjointOffset;
            this.size = size;
            this.hitboxId = hitboxId;
            this.hitRegion = hitRegion;
        }

        public Initialize(target: BasePart | Bone, skill: Skill.Skill)
        {
            return new ActiveHitbox(this, target, skill);
        }
    }

    export interface Contact<A1 extends Entity.CombatantAttributes = Entity.CombatantAttributes, A2 extends Entity.Combatant<A1> = Entity.Combatant<A1>>
    {
        Attacker: A2;
        Attacked: A2;

        AttackerIsBlocking: boolean;
        Region: HitboxRegion;
        Skill: Skill.Skill;
    }

    export class ActiveHitbox
    {
        public static onHitListeners: Set<OnHit> = new Set();

        public readonly Contact: Signal<(contact: Contact) => void> = new Signal();

        private readonly hitbox: Omit<Hitbox, "Initialize">;

        private readonly hitProcessor: RBXScriptConnection;

        private hitboxVisualizer?: BasePart;

        private contactedModels: Set<Model> = new Set();

        private active = true;

        constructor(hitbox: Hitbox, private readonly target: BasePart | Bone, private readonly skill: Skill.Skill)
        {
            this.hitbox = hitbox;

            const targetCFrame = target.CFrame.add(target.CFrame.VectorToWorldSpace(this.hitbox.disjointOffset.mul(new Vector3(1, 1, -1))));
            const preferredHitboxVisualizer = this.hitboxVisualizer = Make("Part", {
                Parent: Workspace,
                CFrame: targetCFrame,
                Size: this.hitbox.size,

                Anchored: true,
                CanQuery: false,
                CanCollide: false,
                CanTouch: false,
                Transparency: 0.7,
                Color: new Color3(1, 0, 0),
            });

            Make("Highlight", {
                Adornee: preferredHitboxVisualizer,
                Parent: preferredHitboxVisualizer,
                FillTransparency: 0.8,
                OutlineTransparency: 0.9,
                OutlineColor: new Color3(1, 0, 0),
                FillColor: new Color3(1, 0, 0),
            });

            task.delay(0.5, () =>
            {
                preferredHitboxVisualizer.Destroy();
            });

            const overlapParams = new OverlapParams();
            overlapParams.FilterDescendantsInstances = [target.FindFirstAncestorWhichIsA("Model")].filterUndefined();
            overlapParams.FilterType = Enum.RaycastFilterType.Exclude;

            this.hitProcessor = RunService.Heartbeat.Connect(async () =>
            {
                const instancesInHitbox = Workspace.GetPartBoundsInBox(targetCFrame, this.hitbox.size, overlapParams);
                const nonCachedModels = instancesInHitbox.mapFiltered((i) => i.FindFirstAncestorWhichIsA("Model")).filter((j) => !this.contactedModels.has(j));

                if (nonCachedModels.isEmpty())
                {
                    return;
                }

                nonCachedModels.map((m) => [m, m.FindFirstChildWhichIsA("Humanoid")] as const)
                    .filter((n) => !!n[1])
                    .filter(([o], p, q) => q.findIndex(([r]) => r === o) === p) // remove duplicates
                    .forEach(async ([hitModel, hitHumanoid]) =>
                    {
                        this.contactedModels.add(hitModel);

                        assert(hitHumanoid, "hit humanoid is not found");
                        assert(hitModel, "hit model is not found");

                        const entityImport = await import("server/components/entity.component");
                        const entityComponent = Dependency<Components>().getComponent(hitModel, entityImport.Entity.Combatant);

                        if (entityComponent)
                        {
                            const quarrelGameService = await import("server/services/quarrelgame.service");
                            const combatGameService = await import("server/services/combat.service");
                            assert(quarrelGameService, "quarrel game service not found");

                            const hitboxModel = target.FindFirstAncestorWhichIsA("Model");
                            assert(hitboxModel, "hitbox does not belong to a model");

                            const hitboxPossessor = hitboxModel?.GetAttribute("ParticipantOwner")
                                ? Dependency<QuarrelGame>().GetParticipantFromId((target.GetAttribute("ParticipantOwner") as string)!)?.character
                                : hitboxModel;

                            assert(hitboxPossessor, "could not find hitbox possessor");

                            const entityIsBlocking = entityComponent.IsBlocking(hitboxPossessor.GetPivot().Position);
                            const possessorEntityComponent = Dependency<CombatService>().GetCombatant(hitboxPossessor);

                            if (possessorEntityComponent)
                            {
                                const contactData: Contact = {
                                    Attacker: possessorEntityComponent,
                                    Attacked: entityComponent,

                                    AttackerIsBlocking: entityIsBlocking,
                                    Region: this.hitbox.hitRegion,
                                    Skill: skill,
                                };

                                this.Contact.Fire(contactData);
                                for (const listener of ActiveHitbox.onHitListeners)
                                {
                                    Promise.try(() => listener.onHit(contactData));
                                }
                            }
                            else
                            {
                                warn("Attacker model found, but the model does not possess a component?");
                            }
                        }
                    });
            });
        }

        public Stop()
        {
            if (!this.active)
            {
                return;
            }

            this.active = false;
            this.contactedModels.clear();
            this.hitProcessor.Disconnect();
            this.Contact.Destroy();
        }
    }
}
