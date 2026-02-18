from pydantic import BaseModel, Field

class DocumentInput(BaseModel):
    """
    Standardized input contract for document processing.
    Used by the Pipeline and PDF Parser to pass file metadata.
    """
    filename: str = Field(..., description="Name of the file (e.g. 'Bajaj_Auto_Annual_Report.pdf')")
    file_path: str = Field(..., description="Absolute or relative path to the file")
    
    # Relaxed type (str) allows dynamic filenames from Web Hunter without crashing Pydantic
    doc_type: str = Field(
        default="Supporting Document", 
        description="Type of document (e.g., 'Annual Report', 'BRSR', 'Investor Presentation')"
    )
    
    class Config:
        frozen = True # Makes instances immutable and hashable