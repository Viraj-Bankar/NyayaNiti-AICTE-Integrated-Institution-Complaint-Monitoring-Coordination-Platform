import sys
sys.path.insert(0, 'backend')
from app.database import engine
from sqlalchemy import inspect

insp = inspect(engine)
p7_tables = [
    'coordination_workspaces',
    'coordination_participants',
    'coordination_tasks',
    'case_coordination_links',
    'action_conflict_alerts',
    'overlap_alerts'
]

print("=== DATABASE SCHEMA AUDIT ===")
for t in p7_tables:
    indexes = [idx['name'] for idx in insp.get_indexes(t)]
    fks = [f"{fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}" for fk in insp.get_foreign_keys(t)]
    cols = [f"{col['name']} ({col['type']})" for col in insp.get_columns(t)]
    print(f"\nTABLE: {t}")
    print(f"  Columns: {len(cols)}")
    print(f"  Indexes: {indexes}")
    print(f"  Foreign Keys: {fks}")

