# File: src/tools/web_search.py
import os
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.tools import tool

class WebSearchTool:
    def __init__(self):
        # Ensure TAVILY_API_KEY is in your .env
        if not os.getenv("TAVILY_API_KEY"):
            print("⚠️ Warning: TAVILY_API_KEY not found. Search will fail.")
        
        self.search = TavilySearchResults(max_results=3)

    @tool("corporate_doc_hunter")
    def hunt_documents(query: str):
        """
        Use this tool to find Annual Reports, BRSR filings, or Financial Results 
        for Indian Automotive companies.
        Useful for finding: "ROA ROE impact labor code", "Mahindra Annual Report 2025 pdf".
        """
        search_engine = TavilySearchResults(max_results=5)
        return search_engine.invoke(query)

    @tool("labour_code_impact_search")
    def search_impact_params(parameter: str):
        """
        Search for specific labor code impacts like 'Gratuity increase', 
        'OSHWC medical checkup rules', or 'Fixed Term Employment notifications'.
        """
        search_engine = TavilySearchResults(max_results=3)
        return search_engine.invoke(f"India Labour Code impact on {parameter} 2025")