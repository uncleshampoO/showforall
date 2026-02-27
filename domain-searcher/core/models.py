from datetime import datetime
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship, create_engine, Session, select
from pathlib import Path
import json

class Account(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password: str
    email: str
    status: str = Field(default="active")  # active, banned, cooldown
    storage_state_json: str = Field(default="{}")  # Playwright storage state
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used: Optional[datetime] = None

    @property
    def storage_state(self) -> dict:
        return json.loads(self.storage_state_json)
    
    @storage_state.setter
    def storage_state(self, value: dict):
        self.storage_state_json = json.dumps(value)

class SearchTask(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    target_count: int
    found_count: int = Field(default=0)
    status: str = Field(default="pending")  # pending, running, completed, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    results: List["DomainResult"] = Relationship(back_populates="task")

class DomainResult(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    bl: int = Field(default=0)
    age_years: int = Field(default=0)
    status: str = Field(default="pending")  # pending, available, taken
    source_page: int
    found_at: datetime = Field(default_factory=datetime.utcnow)
    
    task_id: Optional[int] = Field(default=None, foreign_key="searchtask.id")
    task: Optional[SearchTask] = Relationship(back_populates="results")

# Database setup
DB_FILE = Path(__file__).resolve().parent.parent / "domains.db"
sqlite_url = f"sqlite:///{DB_FILE}"
engine = create_engine(sqlite_url)

def init_db():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
