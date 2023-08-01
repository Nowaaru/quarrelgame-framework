import { Networking } from "@flamework/networking";
import type { SprintState } from "server/services/movement.service";

interface ServerEvents {}

interface ClientEvents {}

interface ServerFunctions {
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
