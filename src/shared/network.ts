import { Networking } from "@flamework/networking";
import { Input, Motion, MotionInput } from "./util/input";

import type { MatchPhase, MatchSettings, MatchState } from "server/services/matchservice.service";
import type { EntityState } from "./util/lib";

import type { Entity } from "server/components/entity.component";
import type MapNamespace from "server/components/map.component";
import type { ParticipantAttributes } from "server/components/participant.component";

/**
 * Functions that can only have callbacks defined on the server,
 * but can be executed on the client.
 *
 * 📝 Execution of these functions translate to the correlating
 * event or function being fired/invoked.
 */
export namespace Server
{
    interface MovementFunctions
    {
        Crouch(crouchState: EntityState.Crouch | EntityState.Idle): boolean;
        Jump(): boolean;
    }

    type InputFunctions = {
        [key in Input]: (this: InputFunctions) => boolean;
    };

    /**
     * Functions related specifically to
     * the functionality of combat.
     *
     * e.g. `SubmitMotionInput`,
     */
    interface CombatFunctions extends InputFunctions
    {
        SubmitMotionInput(motionInput: MotionInput): boolean;
    }

    interface MatchFunctions
    {
        /**
         * Starts the match.
         * ---
         * ⚠️ This function is only callable by the match
         * host. If the player is not the match host, this
         * function will error.
         */
        StartMatch(): boolean;

        /**
         * Creates a new match.
         *
         * @param matchSettings The settings to use for the match.
         * ---
         * ⚠️ This function is only callable by a player
         * who is not currently in a match. If the player
         * is in a match, this function will error.
         * ---
         * @returns The ID of the match.
         */
        CreateMatch(matchSettings?: MatchSettings): string;

        /**
         * Forcefully ends the match.
         * ---
         * ⚠️ This function is only callable by the match
         * host. If the player is not the match host, this
         * function will error.
         */
        ForceEndMatch(): boolean;

        /**
         * Re-creates the match with the same settings.
         * ---
         * ⚠️ This function is only callable by the match
         * host. If the player is not the match host, this
         * function will error.
         */
        Rematch(): boolean;

        /**
            * Modifies the match's settings live while the match is in progress.
            *
            * ---
            * ⚠️ This function is only callable by the match
            * host. If the player is not the match host, this
            * function will error.
            *
            * ⚠️ This can lead to unexpected behavior if some settings are changed
            * while the match is in progress. It is advised to only use this function
            * to change settings that are not related to the match's progression.

              * @param settings The settings to modify.
            */
        ModifyMatchSettings(settings: Partial<MatchSettings>): boolean;

        /**
         * Sets the match's settings.
         *
         * ---
         * ⚠️ This function is only callable by the match
         * host. If the player is not the match host, this
         * function will error.
         *
         * ⚠️ This function cannot be used to modify the match's settings
         * while the match is in progress. Use {@link ModifyMatchSettings} instead.
         */
        SetMatchSettings(settings: MatchSettings): boolean;

        /**
         * Gets the match's current state.
         *
         * @returns The match's current state.
         */
        GetCurrentMatch():
            | {
                /** The match's settings. */
                Settings: MatchSettings;

                /** The match's current state. */
                Phase: MatchPhase;

                /** The IDs of the match's current participants. */
                Participants: Array<ParticipantAttributes>;

                /** The match's current state. */
                State: MatchState<
                    Entity.PlayerCombatantAttributes,
                    Entity.EntityAttributes
                >;

                /** The match's current map. */
                Map: Folder;

                /** The match's current arena. */
                Arena: {
                    instance: Model;
                    config: MapNamespace.Arena["config"];
                };
            }
            | undefined;
    }

    /**
     * Functions related specifically to
     * the functionality of the game.
     *
     * e.g. `BanPlayer`, `KickPlayer`, `GetTickRate`, `RequestDataStore`, etc.
     */
    interface GameFunctions extends CombatFunctions, MovementFunctions, MatchFunctions
    {
        /**
         * Get the game's tick rate.
         *
         * @returns The game's tick rate.
         */
        GetGameTickRate(): number;

        /**
         * Sets the player's character.
         *
         * @param characterId The character to spawn as when the match starts.
         */
        SelectCharacter(characterId: string): boolean;
    }

    interface MatchEvents
    {
    }

    export interface Events extends MatchEvents
    {}

    export interface Functions extends GameFunctions
    {
        /**
         * Respawns the player's character.
         *
         * @param characterId The character to respawn the player as.
         * If not provided, the player will respawn as their currently selected character.
         */
        RespawnCharacter(characterId?: string): Model;

        KnockbackTest(): boolean;
        TrailTest(): boolean;
        MatchTest(): boolean;
    }
}

/**
 * Functions that can only have callbacks defined on the client,
 * but can be executed on the server.
 *
 * 📝 Execution of these functions translate to the correlating
 * event or function being fired/invoked.
 *
 * ⚠️ As such, functions defined here should be used sparingly
 * as they can be easily abused and lead to the server being overloaded. It
 * is advised to instead use events to communicate between the client and server
 * unless absolutely necessary.
 */
export namespace Client
{
    interface MatchEvents
    {
        ArenaChanged(mapId: string, arenaId: string | number): void;
        MatchParticipantRespawned(characterModel: Model): void;
    }

    export interface Events extends MatchEvents
    {
        Tick(frameTime: number, tickRate: number): number;
        Jump(
            character: Model & { Humanoid: Humanoid; PrimaryPart: BasePart; },
        ): void;
        SetCombatMode(combatMode: CombatMode): void;
    }

    export enum CombatMode
    {
        /**
         * 2D combat mode.
         */
        TwoDimensional = "2D",
        /**
         * 3D combat mode.
         */
        ThreeDimensional = "3D",
    }

    export interface Functions
    {
        RequestLoadMap(mapId: string): boolean;
    }
}

export const GlobalEvents = Networking.createEvent<
    Server.Events,
    Client.Events
>();
export const GlobalFunctions = Networking.createFunction<
    Server.Functions,
    Client.Functions
>();

export const ServerFunctions = GlobalFunctions.server;
export const ClientFunctions = GlobalFunctions.client;

export const ServerEvents = GlobalEvents.server;
export const ClientEvents = GlobalEvents.client;
