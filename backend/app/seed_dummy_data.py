"""Seed rich development dummy data for TrackSafar.

Provisions verified dummy accounts and fleet data for local testing:
- Administrator: admin@tracksafar.com / Admin@123456
- Driver:        driver@tracksafar.com / Driver@123456 (DRV-001)
- Passenger:     passenger@tracksafar.com / Passenger@123456

Also creates buses, routes, stops, active driver assignments,
an active trip with real-time GPS location, alerts, incidents, and audit logs.
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password
from app.core.config import settings
from app.models import (
    AlertAudience,
    AlertSeverity,
    Assignment,
    AssignmentStatus,
    AuditEvent,
    AuditOutcome,
    Bus,
    BusLocationCurrent,
    DevAuthUser,
    Driver,
    IncidentStatus,
    Notification,
    OperationalIncident,
    Profile,
    Role,
    Route,
    RouteDirection,
    RouteStop,
    Stop,
    SystemAlert,
    Trip,
    TripStatus,
    new_id,
    utcnow,
)
from app.models.database import SessionLocal, init_db

logger = logging.getLogger("tracksafar.seed")


async def seed_dummy_data(force: bool = False) -> None:
    if settings.auth_mode != "development" and not force:
        logger.info("Skipping dummy data seed: auth_mode is not development")
        return

    await init_db()

    async with SessionLocal() as db:
        # 1. Accounts & Profiles
        # ---------------------------------------------------------------------
        admin_email = "admin@tracksafar.com"
        driver_email = "driver@tracksafar.com"
        passenger_email = "passenger@tracksafar.com"

        # Check if already seeded
        admin_prof = (
            await db.execute(select(Profile).where(Profile.email == admin_email))
        ).scalar_one_or_none()

        if admin_prof and not force:
            logger.info("Dummy data already seeded (admin account found).")
            return

        logger.info("Seeding development dummy data...")

        # Admin user
        admin_user = (
            await db.execute(select(DevAuthUser).where(DevAuthUser.email == admin_email))
        ).scalar_one_or_none()
        if not admin_user:
            admin_user = DevAuthUser(
                id=new_id(),
                email=admin_email,
                password_hash=hash_password("Admin@123456"),
            )
            db.add(admin_user)
            await db.flush()

        if not admin_prof:
            admin_prof = Profile(
                id=new_id(),
                auth_user_id=admin_user.id,
                full_name="System Administrator",
                email=admin_email,
                phone="+92 300 0000001",
                role=Role.admin,
                is_active=True,
            )
            db.add(admin_prof)
            await db.flush()

        # Driver user
        driver_user = (
            await db.execute(select(DevAuthUser).where(DevAuthUser.email == driver_email))
        ).scalar_one_or_none()
        if not driver_user:
            driver_user = DevAuthUser(
                id=new_id(),
                email=driver_email,
                password_hash=hash_password("Driver@123456"),
            )
            db.add(driver_user)
            await db.flush()

        driver_prof = (
            await db.execute(select(Profile).where(Profile.email == driver_email))
        ).scalar_one_or_none()
        if not driver_prof:
            driver_prof = Profile(
                id=new_id(),
                auth_user_id=driver_user.id,
                full_name="Muhammad Tariq",
                email=driver_email,
                phone="+92 300 1234567",
                role=Role.driver,
                is_active=True,
            )
            db.add(driver_prof)
            await db.flush()

        driver = (
            await db.execute(select(Driver).where(Driver.profile_id == driver_prof.id))
        ).scalar_one_or_none()
        if not driver:
            driver = Driver(
                id=new_id(),
                profile_id=driver_prof.id,
                driver_code="DRV-001",
                license_number="LHR-2024-8842",
                is_active=True,
            )
            db.add(driver)
            await db.flush()

        # Passenger user 1
        passenger_user = (
            await db.execute(select(DevAuthUser).where(DevAuthUser.email == passenger_email))
        ).scalar_one_or_none()
        if not passenger_user:
            passenger_user = DevAuthUser(
                id=new_id(),
                email=passenger_email,
                password_hash=hash_password("Passenger@123456"),
            )
            db.add(passenger_user)
            await db.flush()

        passenger_prof = (
            await db.execute(select(Profile).where(Profile.email == passenger_email))
        ).scalar_one_or_none()
        if not passenger_prof:
            passenger_prof = Profile(
                id=new_id(),
                auth_user_id=passenger_user.id,
                full_name="Fatima Zahra",
                email=passenger_email,
                phone="+92 321 7654321",
                role=Role.passenger,
                is_active=True,
            )
            db.add(passenger_prof)
            await db.flush()

        # Passenger user 2
        p2_email = "ali.passenger@tracksafar.com"
        p2_user = (
            await db.execute(select(DevAuthUser).where(DevAuthUser.email == p2_email))
        ).scalar_one_or_none()
        if not p2_user:
            p2_user = DevAuthUser(
                id=new_id(),
                email=p2_email,
                password_hash=hash_password("Passenger@123456"),
            )
            db.add(p2_user)
            await db.flush()
            p2_prof = Profile(
                id=new_id(),
                auth_user_id=p2_user.id,
                full_name="Ali Ahmed",
                email=p2_email,
                phone="+92 333 4567890",
                role=Role.passenger,
                is_active=True,
            )
            db.add(p2_prof)
            await db.flush()

        # 2. Fleet Buses
        # ---------------------------------------------------------------------
        buses_data = [
            ("BUS-101", "LEA-2024-101", "Speedo Metro", 45),
            ("BUS-102", "LEA-2024-102", "Speedo Metro", 45),
            ("BUS-103", "LEA-2024-103", "Electric Bus Feeder", 35),
            ("BUS-104", "LEA-2024-104", "LTC Urban", 50),
        ]
        bus_map = {}
        for num, reg, op, cap in buses_data:
            b = (await db.execute(select(Bus).where(Bus.bus_number == num))).scalar_one_or_none()
            if not b:
                b = Bus(
                    id=new_id(),
                    bus_number=num,
                    registration_number=reg,
                    operator=op,
                    seating_capacity=cap,
                    is_active=True,
                )
                db.add(b)
                await db.flush()
            bus_map[num] = b

        # 3. Stops
        # ---------------------------------------------------------------------
        stops_data = [
            ("Railway Station", 31.5546, 74.3142),
            ("Shimla Pahari", 31.5412, 74.3265),
            ("Mozang Chungi", 31.5305, 74.3198),
            ("Kalma Chowk", 31.5038, 74.3317),
            ("Model Town Link Road", 31.4785, 74.3190),
            ("Green Town Market", 31.4395, 74.3051),
            ("Liberty Market", 31.5102, 74.3435),
            ("Gaddafi Stadium", 31.5135, 74.3332),
        ]
        stop_map = {}
        for name, lat, lon in stops_data:
            s = (await db.execute(select(Stop).where(Stop.name == name))).scalar_one_or_none()
            if not s:
                s = Stop(id=new_id(), name=name, latitude=lat, longitude=lon, is_active=True)
                db.add(s)
                await db.flush()
            stop_map[name] = s

        # 4. Routes & RouteStops
        # ---------------------------------------------------------------------
        route_r01 = (
            await db.execute(
                select(Route).where(
                    Route.route_number == "R-01", Route.direction == RouteDirection.outbound
                )
            )
        ).scalar_one_or_none()

        if not route_r01:
            route_r01 = Route(
                id=new_id(),
                route_number="R-01",
                name="Railway Station to Green Town",
                origin="Railway Station",
                destination="Green Town Market",
                direction=RouteDirection.outbound,
                is_active=True,
                path=[
                    [74.3142, 31.5546],
                    [74.3265, 31.5412],
                    [74.3198, 31.5305],
                    [74.3317, 31.5038],
                    [74.3190, 31.4785],
                    [74.3051, 31.4395],
                ],
            )
            db.add(route_r01)
            await db.flush()

            # Sequence route stops
            r01_stops = [
                "Railway Station",
                "Shimla Pahari",
                "Mozang Chungi",
                "Kalma Chowk",
                "Model Town Link Road",
                "Green Town Market",
            ]
            for seq, st_name in enumerate(r01_stops, start=1):
                rs = RouteStop(
                    id=new_id(),
                    route_id=route_r01.id,
                    stop_id=stop_map[st_name].id,
                    sequence=seq,
                )
                db.add(rs)
            await db.flush()

        route_r02 = (
            await db.execute(
                select(Route).where(
                    Route.route_number == "R-02", Route.direction == RouteDirection.inbound
                )
            )
        ).scalar_one_or_none()

        if not route_r02:
            route_r02 = Route(
                id=new_id(),
                route_number="R-02",
                name="Green Town to Railway Station",
                origin="Green Town Market",
                destination="Railway Station",
                direction=RouteDirection.inbound,
                is_active=True,
                path=[
                    [74.3051, 31.4395],
                    [74.3190, 31.4785],
                    [74.3317, 31.5038],
                    [74.3198, 31.5305],
                    [74.3265, 31.5412],
                    [74.3142, 31.5546],
                ],
            )
            db.add(route_r02)
            await db.flush()

        # 5. Active Driver Assignment
        # ---------------------------------------------------------------------
        active_assignment = (
            await db.execute(
                select(Assignment).where(
                    Assignment.driver_id == driver.id,
                    Assignment.status == AssignmentStatus.active,
                )
            )
        ).scalar_one_or_none()

        if not active_assignment:
            active_assignment = Assignment(
                id=new_id(),
                driver_id=driver.id,
                bus_id=bus_map["BUS-101"].id,
                route_id=route_r01.id,
                status=AssignmentStatus.active,
                valid_from=utcnow(),
                created_by=admin_prof.id,
            )
            db.add(active_assignment)
            await db.flush()

        # 6. Active Trip & Live Bus Location
        # ---------------------------------------------------------------------
        active_trip = (
            await db.execute(
                select(Trip).where(
                    Trip.driver_id == driver.id,
                    Trip.status == TripStatus.active,
                )
            )
        ).scalar_one_or_none()

        if not active_trip:
            active_trip = Trip(
                id=new_id(),
                assignment_id=active_assignment.id,
                driver_id=driver.id,
                bus_id=bus_map["BUS-101"].id,
                route_id=route_r01.id,
                status=TripStatus.active,
                started_at=utcnow(),
            )
            db.add(active_trip)
            await db.flush()

        # Bus Location (near Kalma Chowk)
        loc = await db.get(BusLocationCurrent, active_trip.id)
        if not loc:
            loc = BusLocationCurrent(
                trip_id=active_trip.id,
                bus_id=bus_map["BUS-101"].id,
                latitude=31.5038,
                longitude=74.3317,
                accuracy_m=10.0,
                sequence=1,
                observed_at=utcnow(),
                received_at=utcnow(),
            )
            db.add(loc)
            await db.flush()

        # 7. System Alerts
        # ---------------------------------------------------------------------
        alert1 = (
            await db.execute(
                select(SystemAlert).where(SystemAlert.title.like("%Route R-01%"))
            )
        ).scalar_one_or_none()

        if not alert1:
            alert1 = SystemAlert(
                id=new_id(),
                title="Route R-01 Operational Notice",
                body="Minor 5-minute traffic delays observed near Mozang Chungi due to infrastructure maintenance.",
                severity=AlertSeverity.info,
                audience=AlertAudience.all_authenticated,
                is_published=True,
                created_by=admin_prof.id,
            )
            alert2 = SystemAlert(
                id=new_id(),
                title="Driver Protocol: Route GPS Verification",
                body="Please ensure your device GPS accuracy is stable before departing from the station terminal.",
                severity=AlertSeverity.warning,
                audience=AlertAudience.drivers,
                is_published=True,
                created_by=admin_prof.id,
            )
            db.add_all([alert1, alert2])

        # 8. Notifications
        # ---------------------------------------------------------------------
        notif1 = (
            await db.execute(
                select(Notification).where(Notification.recipient_id == passenger_prof.id)
            )
        ).scalar_one_or_none()

        if not notif1:
            notif1 = Notification(
                id=new_id(),
                recipient_id=passenger_prof.id,
                title="Welcome to TrackSafar Lahore",
                body="Live bus tracking, route schedules, and arrival estimates are available for all metro lines.",
                category="system",
            )
            notif2 = Notification(
                id=new_id(),
                recipient_id=driver_prof.id,
                title="Active Duty Assignment",
                body="You have been assigned to Route R-01 (Speedo Metro BUS-101). Trip is in progress.",
                category="assignment",
            )
            db.add_all([notif1, notif2])

        # 9. Operational Incident
        # ---------------------------------------------------------------------
        inc = (
            await db.execute(
                select(OperationalIncident).where(OperationalIncident.title.like("%Signal%"))
            )
        ).scalar_one_or_none()

        if not inc:
            inc = OperationalIncident(
                id=new_id(),
                title="Signal Maintenance at Kalma Chowk",
                description="Temporary traffic warden control active during signal controller servicing.",
                severity=AlertSeverity.warning,
                status=IncidentStatus.open,
                trip_id=active_trip.id,
                bus_id=bus_map["BUS-101"].id,
                route_id=route_r01.id,
                reported_by=driver_prof.id,
            )
            db.add(inc)

        # 10. Audit Events
        # ---------------------------------------------------------------------
        audit_sample = (
            await db.execute(
                select(AuditEvent).where(AuditEvent.action == "admin.bootstrap")
            )
        ).scalar_one_or_none()

        if not audit_sample:
            events = [
                AuditEvent(
                    id=new_id(),
                    actor_profile_id=admin_prof.id,
                    actor_email=admin_email,
                    action="admin.bootstrap",
                    entity_type="profile",
                    entity_id=admin_prof.id,
                    outcome=AuditOutcome.success,
                    metadata_json={"email": admin_email, "role": "admin"},
                ),
                AuditEvent(
                    id=new_id(),
                    actor_profile_id=admin_prof.id,
                    actor_email=admin_email,
                    action="driver.provision",
                    entity_type="driver",
                    entity_id=driver.id,
                    outcome=AuditOutcome.success,
                    metadata_json={"driver_code": "DRV-001", "email": driver_email},
                ),
                AuditEvent(
                    id=new_id(),
                    actor_profile_id=admin_prof.id,
                    actor_email=admin_email,
                    action="assignment.create",
                    entity_type="assignment",
                    entity_id=active_assignment.id,
                    outcome=AuditOutcome.success,
                    metadata_json={"bus": "BUS-101", "route": "R-01"},
                ),
                AuditEvent(
                    id=new_id(),
                    actor_profile_id=driver_prof.id,
                    actor_email=driver_email,
                    action="trip.start",
                    entity_type="trip",
                    entity_id=active_trip.id,
                    outcome=AuditOutcome.success,
                    metadata_json={"trip_id": active_trip.id, "status": "active"},
                ),
            ]
            db.add_all(events)

        await db.commit()
        logger.info("Dummy data successfully seeded!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed_dummy_data(force=True))
    print("Seed complete.")
