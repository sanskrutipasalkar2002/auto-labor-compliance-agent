from typing import Optional, List, Literal, Dict, Any
from pydantic import BaseModel, Field, field_validator

# --- 1. Atomic Evidence Unit ---
class Evidence(BaseModel):
    status: Literal["Compliant", "Non-Compliant", "Risk Identified", "Not Disclosed", "Gap", "Positive", "Negative", "N/A"] = Field(
        ..., description="The status of the finding."
    )
    evidence_snippet: str = Field(..., description="Verbatim text extracted from the document.")
    metric_value: Optional[str] = Field(None, description="Extracted number (e.g., '220.4%', 'ISO 45001').")
    source_ref: str = Field(..., description="Strict citation format: '[Source: DocName, Page X]'.")

    @field_validator('source_ref')
    def check_citation_format(cls, v):
        return v

# --- 2. Labour Code Sections ---
class WagesCompliance(BaseModel):
    minimum_wage_status: Evidence = Field(description="Check for minimum wage compliance")
    equal_pay_status: Evidence = Field(description="Check for equal pay ratios")
    profit_sharing_status: Evidence = Field(description="Check for profit sharing/bonuses")

class OSHCompliance(BaseModel):
    safety_systems_status: Evidence = Field(description="ISO 45001, Safety Committees")
    accident_records_status: Evidence = Field(description="Fatality/Injury counts, LTIFR")
    audit_scores_status: Evidence = Field(description="Internal audit scores (e.g. SEMS)")

class IndustrialRelations(BaseModel):
    unionization_status: Evidence = Field(description="Union membership rates")
    collective_bargaining_status: Evidence = Field(description="CBA coverage")
    disputes_strikes_status: Evidence = Field(description="Strikes or lockouts")

class SocialSecurityWelfare(BaseModel):
    leave_policy_status: Evidence = Field(description="Parental/Sick leave")
    retirement_benefits_status: Evidence = Field(description="Pension/Gratuity")
    healthcare_welfare_status: Evidence = Field(description="In-house clinics/Gyms/Welfare Spending")

# --- 3. Main Report Sections ---
class ExecutiveSummary(BaseModel):
    overview: str = Field(description="High-level summary of the audit.")
    key_finding: str = Field(description="The single most critical insight.")

class LaborCodeAnalysis(BaseModel):
    wages: WagesCompliance
    osh: OSHCompliance
    ir: IndustrialRelations
    social_security: SocialSecurityWelfare

class SupplyChainCompliance(BaseModel):
    due_diligence: Evidence = Field(description="Supplier ESG assessments")
    forced_labor_policies: Evidence = Field(description="Zero tolerance policies")
    conflict_minerals: Evidence = Field(description="Responsible sourcing")
    principal_employer_liability: str = Field(description="Analysis of third-party labor risks")

class BusinessImpact(BaseModel):
    operational_efficiency: str = Field(description="Impact on productivity/continuity")
    financial_performance: str = Field(description="Cost vs Return analysis")
    brand_reputation: str = Field(description="ESG indices/Brand value")
    innovation_rnd: str = Field(description="R&D and diversity link")

class StrategicPlan(BaseModel):
    recommendations: List[str] = Field(description="List of strategic recommendations")

# --- 4. Supporting Data ---
class WorkforceData(BaseModel):
    category: str = Field(description="e.g., 'Permanent Employees', 'Contract Workers'")
    total_count: str = Field(default="N/A")
    male_count: str = Field(default="N/A")
    female_count: str = Field(default="N/A")
    turnover_rate: str = Field(default="N/A")

class FinancialMetrics(BaseModel):
    revenue: str = Field(default="N/A")
    ebitda: str = Field(default="N/A")
    net_income: str = Field(default="N/A")
    employee_cost: str = Field(default="N/A")

class VendorProfile(BaseModel):
    vendor_name: str = Field(description="Name of the vendor/partner")
    relationship: str = Field(default="Supply Chain Partner", description="Nature of relationship (e.g. Associate, Subsidiary)")
    compliance_status: str = Field(default="Unknown", description="Compliance status if mentioned")
    key_metrics: str = Field(default="N/A", description="Any specific spend or volume data")

# ✅ NEW: Standardized Business Intelligence Model
class BusinessIntelligence(BaseModel):
    key_products: List[str] = Field(default_factory=list, description="List of major product brands (e.g., AVTR, Bada Dost, Switch)")
    major_customers: List[str] = Field(default_factory=list, description="Key institutional/corporate buyers (e.g., Indian Army, Amazon, Adani)")
    market_position: str = Field(default="N/A", description="Ranking or market share details (e.g., #1 in Bus segment)")

# ✅ NEW: Explicit Labour Code Financial Provision Model
class LabourCodeProvision(BaseModel):
    provision_amount: str = Field(default="N/A", description="The exact INR amount of the provision (e.g., '₹308 Crores')")
    impact_description: str = Field(default="N/A", description="Details of the charge (e.g., 'Impact of new wage definitions on gratuity')")
    fiscal_period: str = Field(default="Q3 FY26", description="The financial period reporting this provision")

# --- 5. The Master Report ---
class AuditReport(BaseModel):
    company_name: str
    report_period: str
    overall_risk_score: str
    
    # Core Analysis Sections
    executive_summary: ExecutiveSummary
    labor_code_analysis: LaborCodeAnalysis
    supply_chain_compliance: SupplyChainCompliance
    business_impact: BusinessImpact
    strategic_plan: StrategicPlan
    
    # Data Tables
    workforce_profile: List[WorkforceData] = Field(default_factory=list)
    supply_chain_profile: List[VendorProfile] = Field(default_factory=list)
    api_financials: FinancialMetrics = Field(default_factory=FinancialMetrics)

    # ✅ UPDATED: Stronger data types for Provisions and Business Intel
    labour_code_impact: Optional[LabourCodeProvision] = Field(
        default_factory=LabourCodeProvision, 
        description="Forensic extraction of financial provisions for new labour codes"
    )

    business_intel: Optional[BusinessIntelligence] = Field(
        default_factory=BusinessIntelligence,
        description="Structured business profile including key products and customers"
    )

    vendors: Optional[List[str]] = Field(
        default=[], 
        description="List of key industrial vendors extracted from Related Party Transactions"
    )