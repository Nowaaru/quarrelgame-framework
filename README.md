## **Quarrel Game Framework** - QGF 💥

Quarrel Game Framework is a series of runtimes that allow developers to
create a variety of hand-to-hand combat games similar to other games like
[Black Magic II](https://www.roblox.com/games/969669348/Game), [Guilty Gear Strive](https://www.guiltygear.com/ggst/en/), and [Under Night In-Birth](https://store.steampowered.com/app/452510/UNDER_NIGHT_INBIRTH_ExeLate/).

#### Todo
* [x] 3D Camera
* [x] 2D Camera

---

* [x] Input Registry
* [x] Frame Data
* [x] Attack Execution
* [x] Custom Characters and Movesets
* [x] Motion Inputs
* [x] Command Inputs
* [x] Entities and Combatants
* [x] Match System Logic
* [x] Jumping
* [x] Hitboxes
* [x] Disjoint Hitboxes
* [x] No Physics Bouncing
* [x] Combo Choreography - Gatling / BEAT!
* [x] **Motion Input Controller Overhaul**
* [ ] **Motion Input Overhaul: Charge Inputs, Charge Inputs with min/max Timing**
* [ ] Combo Choreography - Air Combos
* [ ] Combo Choreography - Blocking
* [ ] Combo Choreography - Perfect Blocking
* [ ] Hurtbox Support
* [ ] Animations - On-Demand Inverse Kinematics (grabbing, pinning, etc)
* [ ] Double Jumping
* [ ] "Matchmaking" System
* [ ] Attack Cinematics
* [ ] Defense Cinematics
* [ ] Chickynoid Integration
* [ ] Rollback Netcode (use Chickynoid)
* [ ] **Component Garbage Collection**

## Usage

This project depends on [**Flamework**](https://fireboltofdeath.dev/docs/flamework/). Flamework is a framework 
designed to make games simpler to create using a singleton and
component structure.

To get started with this package, first install it:
```console
yarn add @rbxts/quarrelgame-framework
npm install @rbxts/quarrelgame-framework
```
After the package is installed, you'll notice that it does quite a bit of..
**nothing.**

This project doesn't do much on its own, and it definitely will not
be your easy break into making your own fighting game without the 
adequate knowledge.

This project exports a variety of singletons for the server and the client
that can be used as *dependencies* or *superclasses* for your own modules. Some
singletons are not meant to be used as a superclass; this will be described
in the documentation and in the intellisense.

The core of the client is the [Client](src/client/controllers/client.controller.ts) controller. This controller has a variety of
methods to handle players and their operations, like events and functions:

```typescript
export function ExampleFunction()
{
    const { character } = Dependency<Client>();
    character.BreakJoints();
}
````

On the server, the core is represented through the [QuarrelGame](src/server/services/quarrelgame.service.ts) service. The QuarrelGame
service is a singleton that handles most events that need to be functional immediately
when the framework starts. These events have a default functionality, but they can be modified as long
as they return the same type as the default. The QuarrelGame service also is intended to automatically
add components that are [integral to the background functionality of the framework](src/server/components).

To see more regarding the usage of this package, please observe [Quarrel Game](https://www.github.com/Nowaaru/quarrelgame).

