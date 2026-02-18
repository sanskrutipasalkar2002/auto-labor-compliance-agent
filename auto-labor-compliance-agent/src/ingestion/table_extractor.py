# Specialized table handling logic# File: src/ingestion/table_extractor.py
import re

class FinancialTableExtractor:
    """
    Locates and extracts specific financial blocks from the Markdown.
    Why? Sending 400 pages to an LLM is expensive and noisy. 
    We send only relevant chunks + surrounding context.
    """
    
    def extract_employee_benefit_table(self, markdown_text: str) -> str:
        """
        Looks for 'Employee Benefit Expense' header and extracts the markdown table following it.
        """
        # Regex to find the header and the immediate next Markdown table
        # Matches: "## Note 24: Employee Benefit Expense" ... | Table | ...
        pattern = r"(?i)(note\s+\d+[:\s]+employee\s+benefit\s+expense|employee\s+cost)([\s\S]{0,500}?)\|(.+?)\|(\n\n)"
        
        match = re.search(pattern, markdown_text, re.MULTILINE)
        if match:
            print("💰 Found 'Employee Benefit Expense' table.")
            return f"Context: {match.group(1)}\n\nTable:\n|{match.group(3)}|"
        
        return "TABLE_NOT_FOUND"

    def extract_brsr_principle_3(self, markdown_text: str) -> str:
        """
        Extracts Principle 3 (Employee Wellbeing) section from BRSR.
        """
        start_marker = "Principle 3"
        end_marker = "Principle 4"
        
        if start_marker in markdown_text and end_marker in markdown_text:
            start_idx = markdown_text.find(start_marker)
            end_idx = markdown_text.find(end_marker)
            print("herb Found BRSR Principle 3 section.")
            return markdown_text[start_idx:end_idx]
            
        return "SECTION_NOT_FOUND"