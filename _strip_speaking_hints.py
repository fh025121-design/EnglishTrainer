from pathlib import Path
import re

path = Path("mobile/speaking-data.js")
text = path.read_text(encoding="utf-8")

# Remove hint-related fields while preserving all existing content structure.
text = re.sub(r"\n\s*hintType:\s*\"[^\"]*\",?", "", text)
text = re.sub(r"\n\s*patternHint:\s*\"[^\"]*\",?", "", text)
text = re.sub(r"\n\s*hints:\s*\[[^\]]*\],?", "", text)

# Clean up trailing commas that may remain before closing braces.
text = re.sub(r",\s*\n(\s*\})", r"\n\1", text)

path.write_text(text, encoding="utf-8")
print("stripped")
