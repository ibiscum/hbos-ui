# WebSocket Type Contracts

This document describes the type contracts defined in [src/types/web-socket.ts](../src/types/web-socket.ts) and the consolidated test suite in [src/types/__tests__/web-socket.test.ts](../src/types/__tests__/web-socket.test.ts).

## Overview

The WebSocket type module models:
- Subscription payloads sent to the backend
- Incoming player event payload variants
- Controller methods used by the player WebSocket store
- Connection option callbacks for socket lifecycle handling

## Core Types

### Subscription

Represents outbound subscription payloads.

Fields:
- players: string[] | null
- event_types: string[] | null

Usage notes:
- Player-scoped subscriptions typically use a single player name array.
- System-wide subscriptions use wildcard player values such as *.
- Null values are used when broad/default backend behavior is desired.

### WsEventType

Enumerates known event names currently used by stores and backend messaging:
- state_changed
- song_changed
- position_changed
- loop_mode_changed
- shuffle_changed
- random_changed
- queue_changed
- capabilities_changed
- metadata_changed
- song_information_update
- volume_changed
- welcome
- subscription_updated

### WsPlayerEvent

Represents incoming event payloads from the WebSocket.

Compatibility highlights:
- Supports both event key variants: type and event_type.
- state uses PlayerState for consistency with player contracts.
- capabilities uses PlayerCapability[] for consistency with capability extraction logic.
- metadata is intentionally partial, since metadata updates are often incremental.
- position supports number, string, and object forms.
- source fields are optional to support payloads where source is missing or partial.

### CreatePlayerWebSocketOptions

Defines callbacks and connection settings for controller creation:
- protocol, hostname, port, apiPrefix
- onConnect
- onDisconnect
- onMessage
- onError

Backward compatibility:
- createPlayerWebSocketOptions is retained as an alias to avoid breaking current imports.

## Consolidated Testing Strategy

The suite in [src/types/__tests__/web-socket.test.ts](../src/types/__tests__/web-socket.test.ts) combines unit and regression coverage in one place.

Unit coverage includes:
- Subscription shapes (player-scoped, wildcard, null semantics)
- Event type key variants
- Typed state and loop mode fields
- Partial metadata updates
- Position payload variants
- WsController signature checks
- Compatibility alias checks for options type naming

Regression coverage includes:
- Source-less event_type payload handling
- Active-player resolution using source and top-level flags
- Presence of event names used by subscription and routing code

## Consumer Alignment

These contracts are aligned to event-handling logic in [src/stores/player-web-socket.ts](../src/stores/player-web-socket.ts), especially:
- Subscription payload shape
- Event-type extraction from type or event_type
- Active-player resolution via source or top-level flags
- Volume event routing
