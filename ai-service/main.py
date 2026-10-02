import base64
import io
import json
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated
from urllib.parse import urlsplit

import httpx
import numpy as np
import tensorflow as tf
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
from PIL import Image
from starlette.concurrency import run_in_threadpool
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "models/final_brain_tumor_model.keras"))
CLASS_NAMES_PATH = Path(os.getenv("CLASS_NAMES_PATH", BASE_DIR / "config/class_names.json"))
PREPROCESSING_PATH = Path(os.getenv("PREPROCESSING_PATH", BASE_DIR / "config/preprocessing_config.json"))
GRADCAM_PATH = Path(os.getenv("GRADCAM_CONFIG_PATH", BASE_DIR / "gradcam/gradcam_config.json"))
MAX_IMAGE_BYTES = 50 * 1024 * 1024
REQUEST_TIMEOUT = float(os.getenv("IMAGE_FETCH_TIMEOUT_SECONDS", "20"))
SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "")


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scanId: str = Field(min_length=1, max_length=40)
    imageUrl: HttpUrl
    format: str = Field(min_length=1, max_length=12)


@asynccontextmanager
async def lifespan(app: FastAPI):
    for path in (MODEL_PATH, CLASS_NAMES_PATH, PREPROCESSING_PATH, GRADCAM_PATH):
        if not path.is_file():
            raise RuntimeError(f"Required AI artifact not found: {path.name}")

    with CLASS_NAMES_PATH.open(encoding="utf-8") as file:
        classes_config = json.load(file)
    with PREPROCESSING_PATH.open(encoding="utf-8") as file:
        preprocessing_config = json.load(file)
    with GRADCAM_PATH.open(encoding="utf-8") as file:
        gradcam_config = json.load(file)

    class_names = classes_config.get("class_names")
    expected_classes = classes_config.get("num_classes")
    if not isinstance(class_names, list) or not class_names or len(class_names) != expected_classes:
        raise RuntimeError("class_names.json has an invalid class list or count")
    if preprocessing_config.get("model_input_shape") != [224, 224, 3]:
        raise RuntimeError("This service currently expects the supplied DenseNet 224x224 RGB input configuration")

    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    if tuple(model.input_shape[1:]) != tuple(preprocessing_config["model_input_shape"]):
        raise RuntimeError(f"Model input shape {model.input_shape} does not match preprocessing config")
    if int(model.output_shape[-1]) != len(class_names):
        raise RuntimeError("Model output class count does not match class_names.json")

    backbone_name = gradcam_config.get("backbone", "densenet121")
    target_layer_name = gradcam_config.get("target_layer")
    try:
        try:
            backbone = model.get_layer(backbone_name)
        except ValueError:
            # The config uses a display name while the serialized model uses a lowercase layer name.
            matching_backbone = next(
                (layer for layer in model.layers if layer.name.casefold() == backbone_name.casefold()),
                None,
            )
            if matching_backbone is None:
                raise
            backbone = matching_backbone
        target_layer = backbone.get_layer(target_layer_name)
    except (ValueError, AttributeError) as error:
        raise RuntimeError("Grad-CAM backbone or target layer does not exist in the selected model") from error
    if tuple(target_layer.output.shape[1:]) != tuple(gradcam_config.get("feature_map_shape", [])):
        raise RuntimeError("Grad-CAM feature map shape does not match gradcam_config.json")

    app.state.model = model
    app.state.class_names = class_names
    app.state.preprocessing = preprocessing_config
    app.state.gradcam = gradcam_config
    app.state.backbone = backbone
    app.state.model_top_layers = model.layers[model.layers.index(backbone) + 1:]
    yield
    app.state.model = None


app = FastAPI(title="BrainScan DenseNet121 inference", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health():
    loaded = getattr(app.state, "model", None) is not None
    return {"status": "ok" if loaded else "loading", "model": "DenseNet121 fine-tuned", "loaded": loaded}


def preprocess_image(image_bytes: bytes, config: dict) -> tuple[np.ndarray, Image.Image]:
    image_size = config["image_size"]
    with Image.open(io.BytesIO(image_bytes)) as opened:
        image = opened.convert(config.get("color_mode", "rgb").upper())
        image = image.resize((image_size[1], image_size[0]), Image.Resampling.BILINEAR)
        display_image = image.copy()
        pixels = np.asarray(image, dtype=np.float32)

    if config.get("rescaling") == "1/255":
        pixels /= 255.0
    expected_range = config.get("input_range", [0, 1])
    if float(np.min(pixels)) < expected_range[0] or float(np.max(pixels)) > expected_range[1]:
        raise ValueError("Preprocessed image values are outside configured model input range")
    return np.expand_dims(pixels, axis=0), display_image


def make_gradcam_heatmap(image_batch: np.ndarray, state) -> np.ndarray:
    model = state.model
    backbone = state.backbone
    target_name = state.gradcam["target_layer"]
    target_layer = backbone.get_layer(target_name)
    grad_model = tf.keras.Model(
        inputs=backbone.input,
        outputs=[target_layer.output, backbone.output],
    )

    with tf.GradientTape() as tape:
        convolution_outputs, backbone_output = grad_model(image_batch, training=False)
        output = backbone_output
        for layer in state.model_top_layers:
            output = layer(output, training=False)
        predicted_index = tf.argmax(output[0])
        class_score = output[:, predicted_index]

    gradients = tape.gradient(class_score, convolution_outputs)
    pooled_gradients = tf.reduce_mean(gradients, axis=(0, 1, 2))
    feature_maps = convolution_outputs[0]
    heatmap = tf.reduce_sum(feature_maps * pooled_gradients[tf.newaxis, tf.newaxis, :], axis=-1)
    if state.gradcam.get("positive_activations_only", True):
        heatmap = tf.maximum(heatmap, 0)
    heatmap = heatmap / (tf.reduce_max(heatmap) + tf.keras.backend.epsilon())
    resized = tf.image.resize(heatmap[..., tf.newaxis], state.gradcam["display_heatmap_size"]).numpy().squeeze()
    return np.clip(resized, 0, 1)


def encode_gradcam_overlay(display_image: Image.Image, heatmap: np.ndarray, alpha: float) -> str:
    gray = np.clip(heatmap * 255, 0, 255).astype(np.uint8)
    red = np.clip(1.5 - np.abs(4 * gray / 255 - 3), 0, 1)
    green = np.clip(1.5 - np.abs(4 * gray / 255 - 2), 0, 1)
    blue = np.clip(1.5 - np.abs(4 * gray / 255 - 1), 0, 1)
    color_map = np.stack([red, green, blue], axis=-1)
    color_map = (color_map * 255).astype(np.uint8)
    heat_image = Image.fromarray(color_map, mode="RGB").resize(display_image.size, Image.Resampling.BILINEAR)
    overlay = Image.blend(display_image.convert("RGB"), heat_image, float(alpha))
    buffer = io.BytesIO()
    overlay.save(buffer, format="PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode("ascii")


def run_model(image_bytes: bytes, state) -> dict:
    started = time.perf_counter()
    batch, display_image = preprocess_image(image_bytes, state.preprocessing)
    probabilities = state.model.predict(batch, verbose=0)[0]
    predicted_index = int(np.argmax(probabilities))
    heatmap = make_gradcam_heatmap(batch, state)
    overlay_url = encode_gradcam_overlay(display_image, heatmap, state.gradcam.get("overlay_alpha", 0.45))
    elapsed_ms = round((time.perf_counter() - started) * 1000)

    return {
        "prediction": {
            "predictedClass": state.class_names[predicted_index],
            "confidence": float(probabilities[predicted_index]),
        },
        "classProbabilities": [
            {"className": class_name, "probability": float(probability)}
            for class_name, probability in zip(state.class_names, probabilities, strict=True)
        ],
        "gradCamUrl": overlay_url,
        "model": {"name": "DenseNet121 Fine-Tuned", "version": "final_brain_tumor_model"},
        "processingTimeMs": elapsed_ms,
    }


@app.post("/analyze")
async def analyze(request: AnalyzeRequest, authorization: Annotated[str | None, Header()] = None):
    if not SERVICE_API_KEY:
        raise HTTPException(status_code=503, detail="AI_SERVICE_API_KEY is not configured")
    if authorization != f"Bearer {SERVICE_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized AI service request")

    if request.format.lower() not in {"png", "jpg", "jpeg"}:
        raise HTTPException(status_code=415, detail="Only PNG and JPG images are supported")

    image_url = urlsplit(str(request.imageUrl))
    # Cloudinary's private_download_url uses api.cloudinary.com; delivery URLs
    # may use res.cloudinary.com. Reject all other hosts to prevent SSRF.
    if image_url.scheme != "https" or image_url.hostname not in {"api.cloudinary.com", "res.cloudinary.com"}:
        raise HTTPException(status_code=400, detail="Only private HTTPS Cloudinary image URLs are accepted")

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, follow_redirects=False) as client:
            upstream = await client.get(str(request.imageUrl))
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="Timed out fetching private MRI image") from error
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Unable to fetch private MRI image") from error

    if upstream.status_code != 200:
        raise HTTPException(status_code=502, detail="Private MRI image could not be retrieved")
    if len(upstream.content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="MRI image exceeds the 50 MB limit")
    if not upstream.content:
        raise HTTPException(status_code=400, detail="MRI image is empty")

    try:
        result = await run_in_threadpool(run_model, upstream.content, app.state)
    except (OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="MRI image could not be decoded or preprocessed") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Model inference failed") from error

    return result
