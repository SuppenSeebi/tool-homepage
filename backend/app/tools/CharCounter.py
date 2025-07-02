from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class TextInput(BaseModel):
    text: str

@router.post("/CharCounter")
async def CharCounter(data: TextInput):
    text = data.text
    encoded = text.encode('utf-8')
    
    byte_count = len(encoded)
    ascii_count = sum(1 for c in text if ord(c) < 128)
    utf_count = len(text)

    ascii_letters = sum(1 for c in text if c.isascii() and c.isalpha())
    ascii_digits = sum(1 for c in text if c.isascii() and c.isdigit())
    ascii_special = sum(1 for c in text if c.isascii() and not c.isalnum())

    encoding = "ASCII" if all(ord(c) < 128 for c in text) else "UTF-8"

    return {
        "byte_count": byte_count,
        "ascii_count": ascii_count,
        "utf_count": utf_count,
        "ascii_letters": ascii_letters,
        "ascii_digits": ascii_digits,
        "ascii_special": ascii_special,
        "encoding": encoding
    }
