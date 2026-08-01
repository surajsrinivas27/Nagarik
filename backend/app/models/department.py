from pydantic import BaseModel, Field
from typing import Dict

class DepartmentSLA(BaseModel):
    department: str
    sla_hours: Dict[str, int] = Field(
        default={
            "Critical": 24,
            "High": 72,
            "Medium": 168,
            "Low": 336
        }
    )

DEFAULT_DEPARTMENTS = ["Roads", "Water", "Electricity", "Sanitation", "Other"]
DEFAULT_URGENCIES = ["Critical", "High", "Medium", "Low"]

SLA_HOURS = {
    "Critical": 24,
    "High": 72,
    "Medium": 168,
    "Low": 336
}
