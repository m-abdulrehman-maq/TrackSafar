"""Exercise controller -> model -> serialized response against disposable SQLite."""

import asyncio

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    database = tmp_path_factory.mktemp("mvc") / "test.db"
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv("DATABASE_URL", f"sqlite+aiosqlite:///{database}")
        patch.setenv("ENVIRONMENT", "development")
        patch.setenv("AUTH_MODE", "development")
        from app.bootstrap_admin import bootstrap
        from app.main import app

        with TestClient(app) as test_client:
            asyncio.run(bootstrap("admin@example.com", "Synthetic-test-password-123"))
            yield test_client


def login(client, email, password="Synthetic-test-password-123"):
    response = client.post("/api/v1/auth/dev/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_health_and_api_contract(client):
    assert client.get("/api/health").json()["status"] == "ok"
    paths = client.get("/api/openapi.json").json()["paths"]
    for path in [
        "/api/v1/auth/me",
        "/api/v1/admin/buses",
        "/api/v1/catalog/routes",
        "/api/v1/driver/assignment",
    ]:
        assert path in paths


def test_registration_login_and_permissions(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Synthetic Passenger",
            "email": "passenger@example.com",
            "password": "Synthetic-test-password-123",
            "accept_terms": True,
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["role"] == "passenger"
    headers = login(client, "passenger@example.com")
    assert client.get("/api/v1/auth/me", headers=headers).json()["email"] == "passenger@example.com"
    assert client.get("/api/v1/admin/buses", headers=headers).status_code == 403
    assert client.get("/api/v1/auth/me").status_code == 401
    assert client.get("/api/v1/catalog/buses", headers=headers).status_code == 200


def test_bus_create_update_and_public_catalog(client):
    headers = login(client, "admin@example.com")
    response = client.post(
        "/api/v1/admin/buses",
        headers=headers,
        json={"bus_number": "TEST-01", "seating_capacity": 40},
    )
    assert response.status_code == 201, response.text
    bus_id = response.json()["id"]
    response = client.get("/api/v1/admin/buses?search=TEST-01", headers=headers)
    assert response.json()["total"] == 1
    response = client.patch(
        f"/api/v1/admin/buses/{bus_id}", headers=headers, json={"is_active": False}
    )
    assert response.status_code == 200, response.text
    assert response.json()["is_active"] is False
    assert client.get("/api/v1/catalog/buses", headers=headers).json()["total"] == 0


def test_validation_is_preserved(client):
    headers = login(client, "admin@example.com")
    response = client.post(
        "/api/v1/admin/buses", headers=headers, json={"bus_number": "", "seating_capacity": -1}
    )
    assert response.status_code == 422
    assert (
        client.post(
            "/api/v1/auth/dev/login", json={"email": "admin@example.com", "password": "wrong"}
        ).status_code
        == 401
    )


def test_tracking_socket_authentication_and_ping(client):
    from starlette.websockets import WebSocketDisconnect

    with client.websocket_connect("/ws/tracking") as socket:
        socket.send_json({"type": "auth", "token": "invalid"})
        with pytest.raises(WebSocketDisconnect) as failure:
            socket.receive_json()
        assert failure.value.code == 4401

    headers = login(client, "admin@example.com")
    with client.websocket_connect("/ws/tracking") as socket:
        socket.send_json(
            {"type": "auth", "token": headers["Authorization"].removeprefix("Bearer ")}
        )
        socket.send_json({"type": "ping"})
        assert socket.receive_json()["type"] == "pong"
