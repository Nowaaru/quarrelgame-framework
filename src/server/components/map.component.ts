import { BaseComponent, Component, Components } from "@flamework/components";
import { Dependency, OnStart } from "@flamework/core";
import Make from "@rbxts/make";
import { Entity as ServerEntity } from "server/components/entity.component";
import { QuarrelGame } from "server/services/quarrelgame.service";
import { Entity } from "shared/components/entity.component";
import { ServerEvents } from "shared/network";
import { Identifier } from "shared/util/identifier";
import { Model } from "shared/util/model";

namespace _Map
{
    export enum ArenaType
    {
        "2D" = "_2d",
        "3D" = "_3d",
    }

    /**
     * The attributes of a Map instance.
     */
    interface MapAttributes
    {
        /**
         * The ID of the folder that contains the Map.
         */
        MapId: string;

        /**
         * The Id of the current Map instance.
         * Separate from the MapId attribute.
         */
        id?: string;
    }

    /**
     * An object that can resolve into an arena model.
     * If:
     * * The arena's wall breaks
     * * The enemy gets launched out of the arena
     * * [...]
     *
     * Then the model possessing the number following this arena's
     * number will be cloned.
     */
    export interface ArenaLike
    {
        /**
         * The model that will be cloned
         * when the arena is loaded.
         */
        readonly model: Model;

        /**
         * The configuration of the arena.
         */
        readonly config: ArenaConfiguration;
    }

    export interface ArenaConfiguration<T extends ArenaType = typeof ArenaType["2D"]>
    {
        /**
         * The location that the battle revolves around
         * in this arena. This is typically the center of the arena.
         *
         * When the battle starts, the Arena combatants will be
         * be placed in this location; spaced by {@link ArenaConfiguration.CombatantSpacing CombatantSpacing} studs.
         *
         * 📝 Defaults to the Arena model's pivot.
         */
        Origin: CFrame;

        /**
         * The location that the battle revolves around
         * in this arena. This is typically the center of the arena.
         *
         * When the battle starts, the Arena combatants will be
         * be placed in this location; spaced by XYZ studs.
         *
         * 📝 Defaults to `5`.
         */
        CombatantSpacing: number;

        /**
         * The axis that the entities
         * will be restricted to moving on
         * when fighting.
         *
         * Does nothing if the Arena is a
         * 3D arena.
         *
         * 📝 Defaults to the Arena model's LookVector.
         */
        Axis: Vector3;

        /**
         * The maximum size of the arena.
         * If the arena is a 3D arena, then
         * this will be a number representing
         * the radius of the arena.
         *
         * If the arena is a 2D arena, then
         * this will be a Vector2 representing the size
         * of the arena in the X and Z axes.
         *
         * 📝 Defaults to `100` if the arena is a 3D arena.
         * 📝 Defaults to `Vector2.new(100, 100)` if the arena is a 2D arena.
         */
        Size: T extends typeof ArenaType["2D"] ? Vector2 : number;
    }

    /**
     * A modulescript that returns the load order of the script
     * in the arena. If this script returns `nil`, then the script
     * will be loaded last amongst the scripts that have defined
     * their intended load order.
     */
    type ArenaScript = ModuleScript;

    type ValueifyConfiguration<
        T extends Required<ArenaConfiguration> = ArenaConfiguration,
    > = {
        [K in keyof T]: T[K] extends CFrame ? CFrameValue
            : T[K] extends Vector3 ? Vector3Value
            : T[K] extends Vector2 ? Vector3Value
            : T[K] extends number ? NumberValue
            : T[K] extends string ? StringValue
            : T[K] extends boolean ? BoolValue
            : T[K] extends Instance ? ObjectValue
            : T[K] extends Color3 ? Color3Value
            : K;
    };
    export type ConfigurationToValue =
        & Configuration
        & (ValueifyConfiguration & Partial<ValueifyConfiguration>);

    export type Arena<
        T extends ArenaLike | (Model & { PrimaryPart: BasePart; }) = ArenaLike,
    > = T extends ArenaLike ? Model & {
            /**
             * The configuration of the arena.
             * Your arena can use this to change the
             * activity of the game scripts.
             */
            config: Required<ConfigurationToValue>;
            /**
             * The list of scripts that will be loaded
             * in the arena. Must be Parallel Luau-friendly.
             */
            script?: Actor;
            model: Folder;
        }
        : Arena<ArenaLike & { model: T; }>;

    /**
     * An Interface that describes the general structure
     * of a Map folder.
     */
    export interface MapInstance extends Folder
    {
        model: {
            /**
             * The list of arenas that
             * can be used in this map.
             *
             * Arenas should be separated fairly
             * far away from eachother in order to
             * have cinematic wall-break sequences.
             */
            arena: Folder & {
                _2d: Folder & {
                    [key: number]: Arena;
                };
                _3d: Folder & {
                    [key: number]: Arena;
                };
            };

            /**
             * Models used for detailing outside of
             * the arena.
             */
            detail: Folder & {
                [key: string]: Instance;
            };
        };
        meta: ModuleScript;
    }

    export interface MapMetadata
    {
        name: string;
        music?: Sound | string | (Sound | string)[];
    }

    @Component({})
    export class MapComponent extends BaseComponent<MapAttributes, Folder & { CharacterContainer: Folder; }> implements OnStart
    {
        private currentMap!: MapInstance;

        private readonly entityLocations = new Map<
            Entity,
            { arenaType: ArenaType; arenaIndex: number; }
        >();

        private readonly id = Identifier.GenerateComponentId(this, "id");

        public GetArenaFromIndex(
            arenaType: ArenaType,
            arenaIndex: number,
        ): Arena | undefined
        {
            return this.currentMap.model.arena[arenaType]
                .GetChildren()
                .mapFiltered(({ Name: arenaName }) =>
                {
                    if (tonumber(arenaIndex) === tonumber(arenaName))
                    {
                        return this.currentMap.model.arena[arenaType][
                            arenaName as never
                        ] as Arena;
                    }
                })[0];
        }

        public MoveEntityToArena(
            arenaType: ArenaType,
            arenaIndex: number,
            entity: Entity,
        )
        {
            print("it runs!");
            const arena = this.GetArenaFromIndex(arenaType, arenaIndex);
            assert(arena, `arena of index ${arenaIndex} does not exist.`);

            const arenaConfig = this.GetArenaConfig(arenaType, arenaIndex);
            const arenaOrigin = (arenaConfig.FindFirstChild("Origin") as CFrameValue | undefined)
                ?.Value ?? arena.GetPivot();
            const arenaAxis = (arenaConfig.FindFirstChild("Axis") as Vector3Value | undefined)
                ?.Value ?? arena.GetPivot().RightVector.mul(-1);

            this.entityLocations.set(entity, { arenaType, arenaIndex });
            if (arenaType === ArenaType["2D"])
            {
                entity
                    .GetPrimaryPart()
                    .PivotTo(
                        CFrame.lookAt(
                            arenaOrigin.Position,
                            arenaOrigin.add(arenaAxis).Position,
                        ).add(new Vector3(0, 2)),
                    );

                task.delay(0.25, () =>
                {
                    print(entity.GetPrimaryPart().GetPivot(), arenaOrigin.Position);
                });
            }
            else
            {
                const { Value: combatantSpacing } = (arenaConfig.FindFirstChild(
                    "CombatantSpacing",
                ) as NumberValue | undefined) ?? { Value: 5 };
                const teleportationLocation = arena
                    .GetPivot()
                    .VectorToWorldSpace(
                        (arena.config.Axis?.Value ?? arena.GetPivot().LookVector).mul(
                            combatantSpacing * (os.clock() % 2 === 0 ? 1 : -1),
                        ),
                    );

                entity
                    .GetPrimaryPart()
                    .PivotTo(
                        CFrame.lookAt(
                            teleportationLocation
                                .mul(new Vector3(1, 0, 1))
                                .add(new Vector3(0, arenaOrigin.Y, 0)),
                            arenaOrigin.Position,
                        ).add(new Vector3(0, 2)),
                    );
            }

            const entityParticipant = Dependency<QuarrelGame>().GetParticipantFromCharacter(entity.instance);
            print("trololololol:", entity.instance, entityParticipant);
            if (entityParticipant)
            {
                print("entity participant found:", entityParticipant);
                ServerEvents.ArenaChanged.fire(entityParticipant.instance, this.id, arenaIndex);
            }
        }
        public GetEntityLocation(
            entity: Entity,
        ): { arenaType: ArenaType; arenaIndex: number; } | undefined
        {
            // print(this.entityLocations, entity, this.entityLocations.get(entity));
            return this.entityLocations.get(entity);
        }

        public GetEntityLocations(): Map<
            Entity,
            { arenaType: ArenaType; arenaIndex: number; }
        >
        {
            return new Map([ ...this.entityLocations ]);
        }

        public GetArenaConfig(
            arenaType: ArenaType,
            arenaIndex: number,
        ): Arena<ArenaLike>["config"]
        {
            const arena = this.GetArenaFromIndex(arenaType, arenaIndex);
            assert(
                arena,
                `arena of index ${arenaIndex} in type ${arenaType} does not exist.`,
            );

            return arena.config;
        }

        onStart()
        {
            this.currentMap = Model.LoadMap(this.attributes.MapId, this.instance);
            assert(
                this.currentMap,
                `map of ID ${this.attributes.MapId} does not exist.`,
            );

            this.currentMap.model.arena.GetChildren().forEach((arenaType) =>
            {
                (arenaType.GetChildren() as Model[]).forEach((arena) =>
                {
                    const defaultValues = [
                        Make("CFrameValue", {
                            Name: "Origin",
                            Value: arena.GetPivot(),
                        }),

                        Make("Vector3Value", {
                            Name: "Axis",
                            Value: arena.GetPivot().RightVector.mul(-1),
                        }),

                        Make("NumberValue", {
                            Name: "CombatantSpacing",
                            Value: 5,
                        }),

                        arena.Parent!.Name.match("2")[0]
                            ? Make("Vector3Value", {
                                Name: "Size",
                                Value: new Vector3(100, 100, 0),
                            })
                            : Make("NumberValue", {
                                Name: "Size",
                                Value: 100,
                            }),
                    ];

                    if (arena.FindFirstChild("config"))
                    {
                        print("arena config found");
                        const arenaConfig = (arena as Arena).config;
                        defaultValues
                            .filter((defaultValue) =>
                            {
                                for (const child of arenaConfig.GetChildren())
                                {
                                    if (child.Name === defaultValue.Name)
                                        return false;
                                }

                                return true;
                            })
                            .forEach((configElement) => (configElement.Parent = arenaConfig));
                    }
                    else
                    {
                        warn("arena config not found");
                        Make("Configuration", {
                            Name: "config",
                            Parent: arena,
                            Children: defaultValues,
                        });
                    }
                });
            });
        }
    }
}

export { _Map as Map };
export default _Map;
