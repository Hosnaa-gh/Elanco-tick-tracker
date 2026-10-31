
import os
from pathlib import Path
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


BASE_DIR = Path(__file__).resolve().parent.parent

DEFAULT_DATABASE_URL = (
    f"sqlite:///{(BASE_DIR / 'tick_tracker.db').as_posix()}"
)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    DEFAULT_DATABASE_URL
)

engine_options = {
    "pool_pre_ping": True
}

if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {
        "check_same_thread": False
    }

engine = create_engine(
    DATABASE_URL,
    **engine_options
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


@contextmanager
def session_scope():
    """Manage database transactions safely."""
    session = SessionLocal()

    try:
        yield session
        session.commit()

    except Exception:
        session.rollback()
        raise

    finally:
        session.close()


def get_db():
    """Provide a database session to FastAPI."""
    session = SessionLocal()

    try:
        yield session

    finally:
        session.close()
