# backend/models.py
from typing import Optional, Literal, List
from pydantic import BaseModel, Field

TrainingArchitecture = Literal['nano', 'lite', 'standard', 'large']
TrainingDevice = Literal['cpu', 'gpu', 'auto']
TrainingRunStatus = Literal['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']


class TrainingConfig(BaseModel):
    architecture: TrainingArchitecture
    epochs: int
    batchSize: int
    learningRate: float
    device: TrainingDevice
    ignoreChecks: bool
    delay_samples: int =0


class TrainingMetadata(BaseModel):
    modeledBy: Optional[str] = None
    gearMake: Optional[str] = None
    gearModel: Optional[str] = None
    gearType: Optional[str] = None
    toneType: Optional[str] = None
    reampSendLevelDb: Optional[float] = None
    reampReturnLevelDb: Optional[float] = None
    tags: Optional[List[str]] = None


class TrainingRunCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    inputFileId: str
    outputFileId: str
    latencySamples: int = Field(0, alias="latencySamples")  
    training: TrainingConfig
    metadata: Optional[TrainingMetadata] = None


class LatencyDetectionRequest(BaseModel):
    inputFileId: str
    outputFileId: str
