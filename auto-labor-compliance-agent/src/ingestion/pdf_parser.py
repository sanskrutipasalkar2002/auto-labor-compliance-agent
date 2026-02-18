import os
import logging
import fitz  # PyMuPDF for fast pre-checks
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions, TableFormerMode
from docling.datamodel.base_models import InputFormat
from docling.backend.pypdfium2_backend import PyPdfiumDocumentBackend
from langsmith import traceable 

# Import Contract for Type Safety
from src.contracts.inputs import DocumentInput

# Disable SSL Verify for corporate environments
os.environ['HF_HUB_DISABLE_SSL_VERIFY'] = '1'
os.environ['CURL_CA_BUNDLE'] = ''

class SanePDFParser:
    def __init__(self):
        print("🔧 Initializing HYBRID Parser (Smart Mode)...")
        # We don't instantiate the backend here, we pass the class type to format_options
        self.backend_cls = PyPdfiumDocumentBackend

    def _is_scanned_pdf(self, file_path: str) -> bool:
        """
        🚀 0.5s Check: Does this PDF have embedded text, or is it just images?
        Returns True if Scanned (needs OCR), False if Digital (fast).
        """
        try:
            doc = fitz.open(file_path)
            # Check up to first 3 pages (sufficient for determination)
            pages_to_check = min(3, len(doc))
            text_found = 0
            
            for i in range(pages_to_check):
                text_found += len(doc[i].get_text())
            
            doc.close()
            
            # Threshold: If avg text per page < 50 chars, it's likely an image scan
            avg_text = text_found / pages_to_check if pages_to_check > 0 else 0
            
            if avg_text < 50:
                print(f"   🔍 Diagnosis: SCANNED PDF (Avg {int(avg_text)} chars/page). Enabling OCR.")
                return True
            else:
                print(f"   🔍 Diagnosis: DIGITAL PDF (Avg {int(avg_text)} chars/page). Disabling OCR (Fast Mode).")
                return False
                
        except Exception as e:
            print(f"   ⚠️ Pre-check warning: {e}. Defaulting to Safer Mode (OCR).")
            return True

    def _get_pipeline_options(self, is_scanned: bool):
        """Dynamic Configuration based on PDF type"""
        options = PdfPipelineOptions()
        
        if is_scanned:
            # SLOW BUT ACCURATE MODE (For Scans)
            options.do_ocr = True
            options.do_table_structure = True
            options.table_structure_options.mode = TableFormerMode.ACCURATE
            options.ocr_options.force_full_page_ocr = True
            # Optimized Scale: 2.0 is usually sufficient and 30% faster than 3.0
            options.images_scale = 2.0 
        else:
            # 🚀 TURBO MODE (For Digital Reports)
            options.do_ocr = False  # <--- HUGE SPEEDUP
            options.do_table_structure = True
            options.table_structure_options.mode = TableFormerMode.FAST
            options.images_scale = 1.0 # Standard scale is fine for digital text extraction
            
        return options

    @traceable(name="PDF Parsing Task") 
    def parse_document(self, doc_input: DocumentInput) -> dict:
        print(f"📄 Processing {doc_input.filename}...")
        
        try:
            # 1. Detect Type
            is_scanned = self._is_scanned_pdf(doc_input.file_path)
            
            # 2. Configure Converter
            pipeline_opts = self._get_pipeline_options(is_scanned)
            
            converter = DocumentConverter(
                format_options={
                    InputFormat.PDF: PdfFormatOption(
                        pipeline_options=pipeline_opts,
                        backend=self.backend_cls # Pass the class, not instance
                    )
                }
            )
            
            # 3. Convert
            result = converter.convert(doc_input.file_path)
            
            # 4. Export
            # We use markdown as it preserves table structure well for LLMs
            markdown_content = result.document.export_to_markdown()
            
            print(f"   ✅ Extraction Complete: {len(markdown_content)} chars.")
            return {"content": markdown_content, "source": doc_input.filename}

        except Exception as e:
            print(f"   ❌ Parsing Error: {e}")
            import traceback
            traceback.print_exc()
            return {"content": "", "source": "Error"}