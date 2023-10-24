## **Quarrel Game Framework** - QGF 💥

Quarrel Game Framework is a series of runtimes that allow developers to
create a variety of hand-to-hand combat games similar to other games like
[Black Magic II](https://www.roblox.com/games/969669348/Game), [Guilty Gear Strive](https://www.guiltygear.com/ggst/en/), and [Under Night In-Birth](https://store.steampowered.com/app/452510/UNDER_NIGHT_INBIRTH_ExeLate/).

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

The core of the client is the [Client]() controller. This controller has a variety of
methods to handle players and their operations, like events and functions:

```typescript
export function ExampleFunction()
{
    const { character } = Dependency<Client>();
    character.BreakJoints();
}
````

On the server, the core is represented through the [QuarrelGame]() service. The QuarrelGame
service is a singleton that handles most events that need to be functional immediately
when the framework starts. These events have a default functionality, but they can be modified as long
as they return the same type as the default. The QuarrelGame service also is intended to automatically
add components that are [integral to the background functionality of the framework](src/server/services).

To see more regarding the usage of this package, please observe the [Quarrel Game](https://www.github.com/Nowaaru/quarrelgame)
