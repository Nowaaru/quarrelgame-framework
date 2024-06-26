import { Components } from "@flamework/components";
import { Dependency, OnInit, OnStart, Service } from "@flamework/core";
import { Entity } from "server/components/entity.component";
import { Client, ServerEvents, ServerFunctions } from "shared/network";
import { Identifier } from "shared/util/identifier";

import { Participant, ParticipantAttributes } from "server/components/participant.component";
import { MatchData as SerializedMatchData } from "shared/util/lib";
import { QuarrelGame } from "./quarrelgame.service";

import Make from "@rbxts/make";
import Signal from "@rbxts/signal";
import MapNamespace from "server/components/map.component";

export enum ArenaTypeFlags
{
    "ALLOW_2D" = 1 << 0,
    "ALLOW_3D" = 1 << 1,
}

export const DefaultMatchSettings: MatchSettings = {
    ArenaType: ArenaTypeFlags["ALLOW_2D"] | ArenaTypeFlags["ALLOW_3D"],
    Map: "happyhome",
};

export interface MatchSettings
{
    /**
     * The maximum amount of combatants.
     */
    MaxCombatants?: number;

    /**
     * The maximum amount of combatants per team.
     */
    MaxCombatantsPerTeam?: number;

    /**
     * The maximum amount of teams.
     */
    MaxTeams?: number;

    /**
     * The maximum amount of time allotted for the match.
     */
    MaxTime?: number;

    /**
     * The amount of stocks allotted for each combatant.
     */
    Stocks?: number;

    /**
     * The static scalar that determines how much damage
     * is dealt to a combatant.
     */
    DamageScalar?: number;

    /**
     * The static scalar that determines how much knockback
     * is dealt to a combatant.
     */
    KnockbackScalar?: number;

    /**
     * The static scalar that determines how much health
     * a combatant has.
     */
    HealthScalar?: number;

    /**
     * The static scalar that determines how much stamina
     * a combatant has.
     */
    StaminaScalar?: number;

    /**
     * The static scalar that determines how much tension
     * a combatant has.
     */
    TensionScalar?: number;

    /**
     * The static scalar that determines how much burst
     * a combatant has.
     */
    BurstScalar?: number;

    /**
     * The static scalar that determines how much guard
     * a combatant has.
     */
    GuardScalar?: number;

    /**
     * The static scalar that determines how fast a combatant
     * regains their Tension.
     */
    TensionRegenScalar?: number;

    /**
     * The static scalar that determines how fast a combatant
     * regains their Health.
     */
    HealthRegenScalar?: number;

    /**
     * The static scalar that determines how fast a combatant
     * regains their Stamina.
     */
    StaminaRegenScalar?: number;

    /**
     * The static scalar that determines how fast a combatant
     * regains their Burst.
     */
    BurstRegenScalar?: number;

    /**
     * The static scalar that determines how fast a combatant
     * regains their Guard.
     */
    GuardRegenScalar?: number;

    /**
     * Turbo mode is a mode that allows combatants to
     * perform actions faster than normal. Normals can
     * be chained into each other, and specials can be
     * chained into each other for a limited amount of time
     * after a normal.
     *
     * Determines whether Turbo Mode is enabled.
     */
    TurboMode?: boolean;

    /**
     * The map that the match will take place in.
     */
    Map: string;

    /**
     * The type of arena that the match will take place in.
     * Requires {@link MatchSettings.Map Map} to be set.
     *
     * @see {@link ArenaTypeFlags}
     */
    ArenaType: number;
}

interface MatchData
{
    Participants: Participant[];

    Settings: MatchSettings;
}

export interface MatchState<CombatantAttr extends Entity.CombatantAttributes, EntityAttr extends Entity.EntityAttributes>
{
    /**
     * The current tick of the match.
     */
    Tick: number;

    /**
     * The current time of the match.
     */
    Time: number;

    /**
     * The state of the combatants and entities in the match.
     */
    CombatantStates: Array<CombatantAttr>;

    /**
     * The state of the entities in the match.
     */
    EntityStates: Array<EntityAttr>;
}

export enum MatchPhase
{
    /**
     * The match is waiting for players to join.
     * This is generally the phase where the host
     * is setting up the match.
     */
    Waiting,
    /**
     * The match is starting. This is the phase
     * where players are being placed in the arena
     * or the arena is being loaded.
     */
    Starting,
    /**
     * The match is in progress. This is the phase where
     * players are actively fighting.
     */
    InProgress,
    /**
     * The match is ending. This is the phase where
     * the match is being cleaned up and the results
     * are being calculated and shown to the participants.
     */
    Ending,
    /**
     * The match has ended. This is the phase where
     * the match has fully cleaned up and the results
     * of the match are processed and stored in the
     * database.
     */
    Ended,
}

export interface PostMatchData
{}

export class Match
{
    private matchSettings: MatchSettings = {
        ArenaType: ArenaTypeFlags["ALLOW_2D"] | ArenaTypeFlags["ALLOW_3D"],
        Map: "happyhome",
    };

    private readonly participants_ready: Set<Participant> = new Set();

    private readonly participants: Set<Participant> = new Set();

    private readonly matchFolder: Folder;

    private matchPhase: MatchPhase = MatchPhase.Waiting;

    private matchHost;

    /** Signals **/
    public readonly Starting = new Signal<() => void>();

    public readonly Ended = new Signal<(postMatchData: PostMatchData) => void>();

    public readonly Ready = new Signal<(participant: string) => void>();

    public readonly NotReady = new Signal<(participant: string) => void>();

    public readonly Joining = new Signal<(participant: string) => void>();

    public readonly Leaving = new Signal<(participant: string) => void>();

    constructor(private readonly originalMatchHost: Participant, public readonly matchId = Identifier.Generate())
    {
        this.matchHost = originalMatchHost;
        this.matchFolder = Make("Folder", {
            Name: `Match-${this.matchId}`,
        });

        this.matchFolder.SetAttribute("MatchId", this.matchId);
    }

    /**
     * Adds a participant to the match.
     *
     * ⚠️ Can lead to unstable behavior if the match is in progress.
     *
     * @param participant The participant to add.
     */
    public AddParticipant(participant: Participant)
    {
        this.participants.add(participant);
        participant.attributes.MatchId = this.matchId;
    }

    /**
     * Mark a participant as 'ready.'
     * Errors if the participant is not added first.
     *
     * ⚠️ Can lead to unstable behavior if the match is in progress.
     *
     * @param participant The participant to add.
     */
    public ReadyParticipant(participant: Participant)
    {

        assert(this.participants.has(participant), `participant ${participant.instance.Name} is not in the current match (${this.matchId})`);
        assert(!this.participants_ready.has(participant), `participant ${participant.instance.Name} is already ready`);

        this.participants_ready.add(participant);
        this.Ready.Fire(participant.id);
        return true;
    }

    /**
     * Mark a participant as 'ready.'
     * Errors if the participant is not added first.
     *
     * ⚠️ Can lead to unstable behavior if the match is in progress.
     *
     * @param participant The participant to add.
     */
    public UnreadyParticipant(participant: Participant)
    {
        assert(this.participants.has(participant), `participant ${participant.instance.Name} is not in the current match (${this.matchId})`);
        assert(this.participants_ready.has(participant), `participant ${participant.instance.Name} is not ready`);

        this.participants_ready.delete(participant);
        this.NotReady.Fire(participant.id);
        return true;
    }

    /**
     * Removes a participant from the match.
     *
     * ⚠️ Can lead to unstable behavior if the match is in progress.
     *
     * 📝 If the participant is the host, then the original host will be set as
     * the new host. If the original host is not in the participants list, then
     * the new host will be the first participant in the participants list.
     *
     * @param participant The participant to remove.
     */
    public RemoveParticipant(participant: Participant)
    {
        if (this.matchHost === participant)
        {
            if (this.participants.has(this.originalMatchHost))
                this.matchHost = this.originalMatchHost;
            else
                this.matchHost = [ ...this.participants ][0];
        }

        participant.attributes.MatchId = undefined;
        this.participants.delete(participant);
        this.Leaving.Fire(participant.id);
    }

    /**
     * Clears the participants and sets the original host as the current host.
     *
     * ⚠️ Can lead to unstable behavior if the match is in progress.
     *
     * 📝 Automatically adds the match host back into the participants list.
     */
    public ClearParticipants()
    {
        for (const participant of this.participants)
        {
            this.participants.delete(participant)
            this.Leaving.Fire(participant.id);
        }
        this.participants.add(this.matchHost);
    }

    /**
     * 📝 Also checks if the player is inside of the lobby as well. If alternative
     * functionality is required, then iterate over the participants and check
     * for otherwise.
     *
     * @param player The {@link Player Player} or {@link Participant Participant} to check.
     * @returns Whether the specified player is either the original host or the current host of the match.
     */
    public HostIs(player: Player | Participant)
    {
        return (
            (this.matchHost.instance === player || this.matchHost === player || this.originalMatchHost === player || this.originalMatchHost.instance === player)
            && this.participants.has(this.matchHost) && [ ...this.participants ].find(
                    (n) => n === player || n.instance === player,
                ) !== undefined
        );
    }

    /**
     * Get the host that first created the match.
     * @returns The original host of the match.
     */
    public GetOriginalHost()
    {
        return this.originalMatchHost;
    }

    /**
     * Get the host of the match.
     * @returns The current host of the match.
     */
    public GetHost()
    {
        return this.matchHost;
    }

    /**
     * Get the match settings.
     * @returns The match settings.
     */
    public GetMatchSettings()
    {
        return { ...this.matchSettings };
    }

    /**
     * Sets the match settings.
     *
     * ⚠️ Can lead to unstable behavior if the match is in progress.
     *
     * @param matchSettings The match settings to set.
     */
    public SetMatchSettings(matchSettings: MatchSettings)
    {
        this.matchSettings = matchSettings;
    }

    /**
     * Requests all participants to load the map.
     * @returns A promise that resolves when all participants have loaded the map.
     */
    private RequestParticipantsLoadMap(): Promise<Participant["id"][]>
    {
        return Promise.all<Promise<Participant["id"]>[]>(
            [ ...this.participants_ready ].map((participant) =>
            {
                print(`requesting participant ${participant.attributes.ParticipantId} to load map...`);
                return new Promise<Participant["id"]>((res, rej) =>
                {
                    return ServerFunctions.RequestLoadMap(
                        participant.instance,
                        this.matchSettings.Map,
                    )
                        .timeout(
                            5,
                            `RequestLoadMap for player ${participant.instance.Name} timed out.`,
                        )
                        .then(() =>
                        {
                            print(`participant ${participant.attributes.ParticipantId} has loaded!`)
                            res(participant.id);
                        })
                        .catch((err) => {
                            print(`participant ${participant.attributes.ParticipantId} failed to load map`)
                            rej(err)
                        });
                });
            }),
        );
    }

    /**
     * Start a new match.
     * @param matchHost The participant that is hosting the match.
     */
    public async StartMatch()
    {
        assert(this.GetReadyParticipants().size() > 0, "there are no ready participants");

        this.matchPhase = MatchPhase.Starting;

        return this.RequestParticipantsLoadMap().then(async () =>
        {
            for (const participant of this.GetReadyParticipants())
                participant.instance.SetAttribute("MatchId", this.matchId);

            this.matchPhase = MatchPhase.InProgress;
            // Get map, arena, and call Predict on respawnCharacter
            // and force them to spawn as Gio

            let map: MapNamespace.MapComponent;
            {
                this.matchFolder.Parent = Dependency<QuarrelGame>().MatchContainer;

                const _map = Make("Folder", {
                    Parent: this.matchFolder,
                    Name: `MapContainer-${this.matchId}`,
                    Children: [
                        Make("Folder", {
                            Name: "CharacterContainer",
                        }),
                    ],
                });

                _map.SetAttribute("MapId", this.matchSettings.Map);
                map = Dependency<Components>().addComponent(
                    _map,
                    MapNamespace.MapComponent,
                );
            }

            const randomStart = ArenaTypeFlags["ALLOW_2D"]; /* [
                ArenaTypeFlags[ "ALLOW_2D" ],
                ArenaTypeFlags[ "ALLOW_3D" ],
            ][ math.random(1, 2) - 1 ];*/

            const arena = randomStart === ArenaTypeFlags["ALLOW_2D"]
                ? map.GetArenaFromIndex(MapNamespace.ArenaType["2D"], 0)
                : map.GetArenaFromIndex(MapNamespace.ArenaType["3D"], 0);

            for (const participant of this.GetReadyParticipants())
            {
                print("loading participant:", participant.instance.Name);
                const startType = randomStart === ArenaTypeFlags["ALLOW_2D"] ? MapNamespace.ArenaType["2D"] : MapNamespace.ArenaType["3D"];
                this.RespawnParticipant(participant, startType, 0);
                ServerEvents.MatchStarted.fire(participant.instance, this.matchId, this.Serialize(participant));
            }

            this.Starting.Fire();
            return Promise.fromEvent(this.Ended).finally(
                () => (this.matchPhase = MatchPhase.Ending),
            );
        }).then(() => print("match started"));
    }

    public Serialize(perspective: Participant)
    {
        return Dependency<MatchService>().SerializeMatch(perspective, this.matchId);
    }

    /**
     * Gets the map that the match is taking place in.
     *
     * 📝 This can only be executed whilst a match is currently
     * ongoing.
     * If you wish to get the map that the match will
     * take place in, then look at {@link Match.GetMatchSettings GetMatchSettings}.
     */
    public GetMap(): MapNamespace.MapComponent
    {
        const mapFolder = this.matchFolder.FindFirstChild(
            `MapContainer-${this.matchId}`,
        ) as Folder;
        assert(mapFolder, `map folder for match ${this.matchId} does not exist.`);

        const mapComponent = Dependency<Components>().getComponent(
            mapFolder,
            MapNamespace.MapComponent,
        );
        assert(
            mapComponent,
            `map component for match ${this.matchId} does not exist.`,
        );

        return mapComponent;
    }

    /**
     * Retrieve the participants in the match.
     * @returns The participants in the match.
     */
    public GetParticipants(): Set<Participant>
    {
        return new Set([ ...this.participants ]);
    }

    /**
     * Retrieve the ready participants in the match.
     * @returns The ready participants in the match.
     */
    public GetReadyParticipants(): Set<Participant>
    {
        return new Set([ ...this.participants_ready ]);
    }

    /**
     * @param participant The participant to respawn.
     * @param arenaType The type of arena to respawn the participant in.
     * @param arenaIndex The index of the arena to respawn the participant in.
     * @param combatMode The combat mode to set the participant to.
     */
    public RespawnParticipant(
        participant: Participant,
        arenaType: MapNamespace.ArenaType = MapNamespace.ArenaType["2D"],
        arenaIndex = 0,
        combatMode: Client.CombatMode = Client.CombatMode.TwoDimensional,
    )
    {
        const map = this.GetMap();
        participant
            .LoadCombatant({
                characterId: participant.attributes.SelectedCharacter,
                matchId: this.matchId,
            })
            .then((combatant) =>
            {
                map.MoveEntityToArena(arenaType, arenaIndex, combatant);

                ServerEvents.MatchParticipantRespawned.fire(
                    participant.instance,
                    combatant.instance,
                );

                ServerEvents.SetCombatMode.fire(participant.instance, combatMode);
            });
    }

    public GetMatchPhase()
    {
        return this.matchPhase;
    }
}

@Service({})
export class MatchService implements OnStart, OnInit
{
    private readonly ongoingMatches = new Map<string, Match>();

    onInit()
    {
        ServerFunctions.SetMatchSettings.setCallback((player, matchSettings) =>
        {
            const thisParticipant = Dependency<QuarrelGame>().GetParticipant(player);
            assert(thisParticipant, `participant for ${player} does not exist.`);

            for (const [ , match ] of this.ongoingMatches)
            {
                if (match.HostIs(thisParticipant))
                {
                    match.SetMatchSettings(matchSettings);

                    return true;
                }
            }

            return false;
        });

        ServerFunctions.Ready.setCallback((player) =>
        {
            const thisParticipant = Dependency<QuarrelGame>().GetParticipant(player);
            assert(thisParticipant, `participant for ${player} does not exist.`);
            assert(thisParticipant.attributes.MatchId, `participant ${player} is not in a match.`);

            const currentMatch = this.GetOngoingMatch(thisParticipant.attributes.MatchId);
            assert(currentMatch, `player ${player}'s current match is invalid`);

            return currentMatch.ReadyParticipant(thisParticipant);
        });

        ServerFunctions.Unready.setCallback((player) =>
        {
            const thisParticipant = Dependency<QuarrelGame>().GetParticipant(player);
            assert(thisParticipant, `participant for ${player} does not exist.`);
            assert(thisParticipant.attributes.MatchId, `participant ${player} is not in a match.`);

            const currentMatch = this.GetOngoingMatch(thisParticipant.attributes.MatchId);
            assert(currentMatch, `player ${player}'s current match is invalid`);

            return currentMatch.UnreadyParticipant(thisParticipant);
        });

        ServerFunctions.CreateMatch.setCallback(
            (player, matchSettings = DefaultMatchSettings) =>
            {
                const thisParticipant = Dependency<QuarrelGame>().GetParticipant(player);
                assert(thisParticipant, `participant for ${player} does not exist.`);
                assert(
                    !thisParticipant.attributes.MatchId || this.GetOngoingMatch(
                                thisParticipant.attributes.MatchId,
                            )?.GetMatchPhase() !== MatchPhase.Ended,
                    "participant is already in a match",
                );

                const newMatch = this.CreateMatch({
                    Participants: [ thisParticipant ],
                    Settings: matchSettings,
                });

                return newMatch.matchId;
            },
        );

        ServerFunctions.StartMatch.setCallback((player) =>
        {
            const thisParticipant = Dependency<QuarrelGame>().GetParticipant(player);
            assert(thisParticipant, `participant for ${player} does not exist.`);
            assert(
                thisParticipant.attributes.MatchId,
                "participant is not in a match",
            );

            const ongoingMatch = this.GetOngoingMatch(
                thisParticipant.attributes.MatchId,
            );
            assert(
                ongoingMatch?.HostIs(thisParticipant),
                "participant is not the host of the match",
            );

            ongoingMatch!.StartMatch();
            return true;
        });

        ServerFunctions.GetCurrentMatch.setCallback((player) =>
        {
            const thisParticipant = Dependency<QuarrelGame>().GetParticipant(player);
            assert(thisParticipant, `participant for ${player} does not exist`);
            if (!thisParticipant.attributes.MatchId)
                return new Promise<void>((_, rej) => rej("participant does not have a match id")) as never;

            const serializedMatch = this.SerializeMatch(thisParticipant, thisParticipant.attributes.MatchId);
            if (serializedMatch)
                return serializedMatch;

            return new Promise<void>((_, rej) => rej("participant is not in a match")) as never;
        });
    }

    public SerializeMatch(thisParticipant: Participant, matchId: string): SerializedMatchData
    {
        const ongoingMatch = this.GetOngoingMatch(
            matchId,
        );

        assert(ongoingMatch, "no ongoing match");
        const currentMap = ongoingMatch.GetMap();
        const currentLocation = currentMap.GetEntityLocation(
            thisParticipant.entity!,
        );
        assert(currentLocation, `participant is not in an arena.`);

        const matchParticipants = ongoingMatch.GetReadyParticipants();
        const matchEntitites = [ ...matchParticipants ].map(
            (participant) => participant.entity as Entity.PlayerCombatant<Entity.PlayerCombatantAttributes>,
        );

        const thisArena = ongoingMatch
            .GetMap()
            .GetArenaFromIndex(
                currentLocation.arenaType,
                currentLocation.arenaIndex,
            )! as SerializedMatchData["Arena"];

        return {
            Settings: ongoingMatch.GetMatchSettings(),
            Arena: thisArena,
            Participants: [ ...matchParticipants ].map<ParticipantAttributes>(
                (participant) => participant.attributes,
            ),
            State: {
                CombatantStates: matchEntitites.map((n) => n.attributes),
                EntityStates: [],
                Tick: -1,
                Time: -1,
            },
            Map: ongoingMatch.GetMap().instance,
            Phase: ongoingMatch.GetMatchPhase(),
            MatchId: matchId,
        };
    }

    onStart()
    {}

    /**
     * Creates a new ongoing match with the specified settings.
     *
     * @param matchData The specifications of the match.
     * @returns The ID of the match.
     */
    public CreateMatch(matchData: MatchData)
    {
        const newMatch = new Match(matchData.Participants[0]);
        this.ongoingMatches.set(newMatch.matchId, newMatch);

        matchData.Participants.forEach((participant) => newMatch.AddParticipant(participant));

        return newMatch;
    }

    public GetOngoingMatch(matchId: string)
    {
        return this.ongoingMatches.get(matchId);
    }

    public GetOngoingMatches(): Set<Match>
    {
        return new Set([ ...this.ongoingMatches ].map(([ , match ]) => match));
    }
}
