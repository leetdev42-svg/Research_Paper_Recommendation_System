import re
import string
from typing import List, Union


def clean_text(text: str) -> str:
    """
    Cleans and normalizes text for NLP feature extraction:
    - Lowers case
    - Replaces punctuation with whitespace
    - Collapses multiple whitespace characters
    """
    if not isinstance(text, str):
        return ""
    
    text = text.lower()
    # Replace punctuation characters with spaces
    text = re.sub(f"[{re.escape(string.punctuation)}]", " ", text)
    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_comma_list(val: Union[str, List[str]]) -> List[str]:
    """
    Parses a string of comma-separated items or returns an existing list of clean strings.
    """
    if isinstance(val, list):
        return [str(item).strip() for item in val if str(item).strip()]
    if not isinstance(val, str) or not val.strip():
        return []
    
    parts = val.split(",")
    return [p.strip() for p in parts if p.strip()]


def combine_paper_text(
    title: str,
    abstract: str,
    keywords: Union[str, List[str]],
    category: str
) -> str:
    """
    Combines relevant textual fields into an enriched document representation for TF-IDF.
    Title and keywords are repeated to give higher contextual relevance in similarity matching.
    """
    clean_title = clean_text(title)
    clean_abstract = clean_text(abstract)
    clean_category = clean_text(category)
    
    kw_list = parse_comma_list(keywords)
    clean_keywords = clean_text(" ".join(kw_list))
    
    # We weight the title and keywords by including them twice to ensure high precision
    tokens = [
        clean_title,
        clean_title,
        clean_keywords,
        clean_keywords,
        clean_category,
        clean_abstract
    ]
    
    return " ".join(t for t in tokens if t)
