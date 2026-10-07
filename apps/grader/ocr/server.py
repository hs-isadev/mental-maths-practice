from contextlib import asynccontextmanager
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image
from pix2text import Pix2Text


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ocr = Pix2Text.from_config()
    yield


app = FastAPI(title="Physics working OCR", lifespan=lifespan)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/ocr")
async def recognize(image: UploadFile = File(...)):
    if image.content_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a PNG, JPEG, or WebP image.")
    raw = await image.read(4 * 1024 * 1024 + 1)
    if len(raw) > 4 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image is larger than 4 MB.")
    try:
        picture = Image.open(BytesIO(raw)).convert("RGB")
    except Exception as error:
        raise HTTPException(status_code=400, detail="Image could not be opened.") from error

    try:
        transcription = app.state.ocr.recognize(
            picture,
            file_type="text_formula",
            return_text=True,
            auto_line_break=True,
        )
    except Exception as error:
        raise HTTPException(status_code=422, detail="OCR could not read this working.") from error
    return {"transcription": str(transcription).strip()}
