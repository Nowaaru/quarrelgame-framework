import { Networking } from "@flamework/networking";

interface ServerEvents {}

interface ClientEvents {}

interface ServerFunctions {
    RespawnCharacter(): boolean,
    KnockbackTest(): boolean,
}

interface ClientFunctions {
}

export const GlobalEvents = Networking.createEvent<ServerEvents, ClientEvents>();
export const GlobalFunctions = Networking.createFunction<ServerFunctions, ClientFunctions>();

export const ServerFunctions = GlobalFunctions.server;
export const ClientFunctions = GlobalFunctions.client;

export const ServerEvents = GlobalEvents.server;
export const ClientEvents = GlobalFunctions.client;
