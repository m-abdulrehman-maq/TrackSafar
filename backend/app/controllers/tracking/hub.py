"""Authenticated WebSocket gateway for sanitized fleet events.

Handshake: connect → client sends {"type":"auth","token":...} within a short
timeout → only then may it subscribe. Reconnect obtains a fresh snapshot
via REST before events are applied.
"""

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.auth import Principal, Role, resolve_principal
from app.core.config import settings

logger = logging.getLogger("tracksafar.ws")


class TrackingHub:
    def __init__(self) -> None:
        self._subscribers: dict[WebSocket, Principal] = {}
        self._lock = asyncio.Lock()

    async def connect(self, ws: WebSocket) -> bool:
        await ws.accept()
        try:
            message = await asyncio.wait_for(
                ws.receive_text(), timeout=settings.ws_auth_timeout_seconds
            )
        except (asyncio.TimeoutError, WebSocketDisconnect):
            await self._close(ws, 4401, "authentication timeout")
            return False
        try:
            data = json.loads(message)
            if data.get("type") != "auth" or not data.get("token"):
                raise ValueError("expected auth message")
            from app.models.database import SessionLocal

            async with SessionLocal() as db:
                principal = await resolve_principal(db, str(data["token"]))
        except WebSocketDisconnect:
            return False
        except Exception as exc:  # invalid token / inactive account
            logger.info("ws auth rejected: %s", type(exc).__name__)
            await self._close(ws, 4401, "authentication failed")
            return False
        async with self._lock:
            self._subscribers[ws] = principal
        return True

    async def disconnect(self, ws: WebSocket) -> None:
        async with self._lock:
            self._subscribers.pop(ws, None)

    async def _close(self, ws: WebSocket, code: int, reason: str) -> None:
        try:
            await ws.close(code=code, reason=reason)
        except Exception:
            pass

    async def publish(
        self, event: dict[str, Any], *, include_roles: set[Role] | None = None
    ) -> None:
        """Fan out a sanitized event to authorized subscribers."""
        payload = json.dumps(event, default=str)
        async with self._lock:
            targets = [
                ws
                for ws, principal in self._subscribers.items()
                if include_roles is None or principal.role in include_roles
            ]
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                await self.disconnect(ws)

    async def subscriber_count(self) -> int:
        async with self._lock:
            return len(self._subscribers)


hub = TrackingHub()


async def tracking_socket(ws: WebSocket) -> None:
    ok = await hub.connect(ws)
    if not ok:
        return
    try:
        while True:
            raw = await ws.receive_text()
            if len(raw) > settings.ws_max_message_bytes:
                await hub._close(ws, 4400, "message too large")
                break
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "error", "reason": "invalid_json"}))
                continue
            if data.get("type") == "ping":
                await ws.send_text(json.dumps({"type": "pong"}))
            elif data.get("type") == "subscribe":
                # Subscription privileges are granted by identity; clients may
                # express interest but cannot widen access beyond their role.
                await ws.send_text(json.dumps({"type": "subscribed"}))
    except WebSocketDisconnect:
        pass
    finally:
        await hub.disconnect(ws)


async def publish_location_update(bus: dict) -> None:
    from datetime import datetime, timezone

    event = {
        "type": "location-updated",
        "version": 1,
        "emitted_at": datetime.now(timezone.utc).isoformat(),
        "data": {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in bus.items()},
    }
    await hub.publish(event)


async def publish_trip_ended(trip_id: str) -> None:
    from datetime import datetime, timezone

    await hub.publish(
        {
            "type": "trip-ended",
            "version": 1,
            "emitted_at": datetime.now(timezone.utc).isoformat(),
            "data": {"trip_id": trip_id},
        }
    )
