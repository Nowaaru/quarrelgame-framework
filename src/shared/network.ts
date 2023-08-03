import { Networking } from "@flamework/networking";
import type { SprintState } from "server/services/movement.service";
import { Input } from "./util/input";
import type { EntityState } from "./util/lib";

interface ServerEvents {
    GameTick(): number
}

interface ClientEvents {}

interface GameFunctions {
    GetGameTickRate(): number
}

interface MovementFunctions {
    Crouch(crouchState: EntityState.Crouch | EntityState.Idle): boolean
    Jump(): boolean
}

type InputFunctions = {
    [key in Input]: (this: InputFunctions) => boolean;
}

interface ServerFunctions extends InputFunctions, GameFunctions, MovementFunctions {
    RespawnCharacter(): boolean;
    RequestSprint(sprintState: SprintState): boolean;

    KnockbackTest(): boolean;
    TrailTest(): boolean;
}

interface ClientFunctions {
}

export const GlobalEvents = Networking.createEvent<ServerEvents, ClientEvents>();
export const GlobalFunctions = Networking.createFunction<ServerFunctions, ClientFunctions>();

export const ServerFunctions = GlobalFunctions.server;
export const ClientFunctions = GlobalFunctions.client;

export const ServerEvents = GlobalEvents.server;
export const ClientEvents = GlobalFunctions.client;
