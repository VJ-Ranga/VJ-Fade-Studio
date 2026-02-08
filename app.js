const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const controls = {
  canvasWidth: document.getElementById("canvasWidth"),
  canvasHeight: document.getElementById("canvasHeight"),
  applyCanvas: document.getElementById("applyCanvas"),
  presetButtons: [...document.querySelectorAll("[data-preset]")],
  transparentBg: document.getElementById("transparentBg"),
  bgColor: document.getElementById("bgColor"),
  bgColorHex: document.getElementById("bgColorHex"),
  imageInput: document.getElementById("imageInput"),
  imageList: document.getElementById("imageList"),
  removeImage: document.getElementById("removeImage"),
  fitImage: document.getElementById("fitImage"),
  centerImage: document.getElementById("centerImage"),
  imageX: document.getElementById("imageX"),
  imageY: document.getElementById("imageY"),
  imageWidth: document.getElementById("imageWidth"),
  imageHeight: document.getElementById("imageHeight"),
  lockRatio: document.getElementById("lockRatio"),
  imageScale: document.getElementById("imageScale"),
  fadeType: document.getElementById("fadeType"),
  fadeDirection: document.getElementById("fadeDirection"),
  fadeTransparent: document.getElementById("fadeTransparent"),
  fadeColorWrap: document.getElementById("fadeColorWrap"),
  fadeColor: document.getElementById("fadeColor"),
  fadeColorHex: document.getElementById("fadeColorHex"),
  fadeSize: document.getElementById("fadeSize"),
  fadeSoftness: document.getElementById("fadeSoftness"),
  brushControls: document.getElementById("brushControls"),
  brushSize: document.getElementById("brushSize"),
  brushStrength: document.getElementById("brushStrength"),
  brushShape: document.getElementById("brushShape"),
  brushEraser: document.getElementById("brushEraser"),
  clearBrush: document.getElementById("clearBrush"),
  downloadPng: document.getElementById("downloadPng"),
  downloadJpg: document.getElementById("downloadJpg"),
  openShortcuts: document.getElementById("openShortcuts"),
  exportName: document.getElementById("exportName"),
  dropHint: document.getElementById("dropHint"),
  canvasInfo: document.getElementById("canvasInfo"),
  canvasWrap: document.getElementById("canvasWrap"),
  rulerTop: document.getElementById("rulerTop"),
  rulerLeft: document.getElementById("rulerLeft"),
  shortcutModal: document.getElementById("shortcutModal"),
  closeShortcuts: document.getElementById("closeShortcuts"),
  closeShortcutsBtn: document.getElementById("closeShortcutsBtn"),
};

const HANDLE_SIZE = 12;
const MIN_IMAGE_SIZE = 20;

function defaultFade() {
  return {
    type: "linear",
    direction: "left",
    mode: "transparent",
    color: "#ffffff",
    size: 40,
    softness: 40,
    brushSize: 90,
    brushStrength: 50,
    brushShape: "round",
  };
}

const state = {
  canvas: {
    width: canvas.width,
    height: canvas.height,
    transparent: true,
    bgColor: "#ffffff",
  },
  images: [],
  activeImageId: null,
  drag: {
    active: false,
    mode: "move",
    handle: null,
    offsetX: 0,
    offsetY: 0,
    lastBrushX: 0,
    lastBrushY: 0,
  },
  pointer: {
    x: 0,
    y: 0,
    inside: false,
    shift: false,
  },
  renderPending: false,
};

function requestRender() {
  if (state.renderPending) return;
  state.renderPending = true;
  window.requestAnimationFrame(() => {
    state.renderPending = false;
    render();
  });
}

function uid(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeHex(value) {
  if (!value) return null;
  let hex = value.trim();
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#([0-9a-fA-F]{3})$/.test(hex)) {
    const m = hex.slice(1);
    return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`.toLowerCase();
  }
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) return hex.toLowerCase();
  return null;
}

function getExportBaseName() {
  const fallback = "vj-fade-image";
  const raw = (controls.exportName.value || "").trim();
  if (!raw) return fallback;
  const safe = raw
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || fallback;
}

function getActiveImage() {
  return state.images.find((img) => img.id === state.activeImageId) || null;
}

function setCanvasSize(width, height) {
  state.canvas.width = width;
  state.canvas.height = height;
  canvas.width = width;
  canvas.height = height;
  controls.canvasWidth.value = width;
  controls.canvasHeight.value = height;
  controls.canvasInfo.textContent = `${width} × ${height}`;
  render();
  drawRulers();
}

function setActiveImage(imageId) {
  state.activeImageId = imageId;
  syncImageControls();
  renderImageList();
  render();
}

function updateFadeModeUI() {
  const active = getActiveImage();
  const transparent = active ? active.fade.mode === "transparent" : true;
  const isBrush = active ? active.fade.type === "brush" : false;
  controls.fadeTransparent.checked = transparent;
  controls.fadeColor.disabled = transparent;
  controls.fadeColorHex.disabled = transparent;
  controls.fadeDirection.disabled = !active || active.fade.type === "radial" || active.fade.type === "none" || isBrush;
  controls.fadeColorWrap.style.display = transparent ? "none" : "flex";
  controls.brushControls.classList.toggle("is-visible", isBrush);
}

function syncImageControls() {
  const active = getActiveImage();
  const disabled = !active;

  [
    controls.fitImage,
    controls.centerImage,
    controls.removeImage,
    controls.imageX,
    controls.imageY,
    controls.imageWidth,
    controls.imageHeight,
    controls.imageScale,
    controls.lockRatio,
    controls.fadeType,
    controls.fadeDirection,
    controls.fadeTransparent,
    controls.fadeSize,
    controls.fadeSoftness,
    controls.brushSize,
    controls.brushStrength,
    controls.brushShape,
    controls.brushEraser,
    controls.clearBrush,
  ].forEach((el) => {
    el.disabled = disabled;
  });

  if (!active) {
    controls.imageX.value = "";
    controls.imageY.value = "";
    controls.imageWidth.value = "";
    controls.imageHeight.value = "";
    controls.imageScale.value = 100;
    controls.fadeType.value = "linear";
    controls.fadeDirection.value = "left";
    controls.fadeSize.value = 40;
    controls.fadeSoftness.value = 40;
    controls.fadeColor.value = "#ffffff";
    controls.fadeColorHex.value = "#ffffff";
    controls.brushSize.value = 90;
    controls.brushStrength.value = 50;
    controls.brushShape.value = "round";
    controls.brushEraser.checked = false;
    updateFadeModeUI();
    return;
  }

  controls.imageX.value = Math.round(active.x);
  controls.imageY.value = Math.round(active.y);
  controls.imageWidth.value = Math.round(active.width);
  controls.imageHeight.value = Math.round(active.height);
  controls.imageScale.value = Math.round(active.scale * 100);

  controls.fadeType.value = active.fade.type;
  controls.fadeDirection.value = active.fade.direction;
  controls.fadeSize.value = active.fade.size;
  controls.fadeSoftness.value = active.fade.softness;
  controls.fadeColor.value = active.fade.color;
  controls.fadeColorHex.value = active.fade.color;
  controls.brushSize.value = active.fade.brushSize ?? 90;
  controls.brushStrength.value = active.fade.brushStrength ?? 50;
  controls.brushShape.value = active.fade.brushShape ?? "round";
  updateFadeModeUI();
}

function createImageLayer(image, src, name, index) {
  const naturalW = image.naturalWidth || image.width;
  const naturalH = image.naturalHeight || image.height;
  const baseScale = Math.min(state.canvas.width / naturalW, state.canvas.height / naturalH);
  const scale = baseScale * (index === 0 ? 1 : 0.85);
  const width = naturalW * scale;
  const height = naturalH * scale;
  const offset = Math.min(index * 20, 120);

  return {
    id: uid("img"),
    name,
    image,
    src,
    naturalW,
    naturalH,
    scale,
    width,
    height,
    x: (state.canvas.width - width) / 2 + offset,
    y: (state.canvas.height - height) / 2 + offset,
    fade: defaultFade(),
    brushMask: null,
  };
}

function ensureBrushMask(layer) {
  if (layer.brushMask) return layer.brushMask;
  const mask = document.createElement("canvas");
  mask.width = layer.naturalW;
  mask.height = layer.naturalH;
  layer.brushMask = mask;
  return mask;
}

function clearBrushMask(layer) {
  if (!layer || !layer.brushMask) return;
  const mctx = layer.brushMask.getContext("2d");
  mctx.clearRect(0, 0, layer.brushMask.width, layer.brushMask.height);
}

function paintBrushAt(layer, canvasX, canvasY) {
  if (!layer) return;
  const localX = (canvasX - layer.x) / layer.width;
  const localY = (canvasY - layer.y) / layer.height;
  if (localX < 0 || localX > 1 || localY < 0 || localY > 1) return;

  const mask = ensureBrushMask(layer);
  const mctx = mask.getContext("2d");
  const mx = localX * mask.width;
  const my = localY * mask.height;

  const radiusCanvas = layer.fade.brushSize || 90;
  const radius = Math.max(2, (radiusCanvas / Math.max(layer.width, 1)) * mask.width);
  const softness = Math.max(0.05, Math.min(layer.fade.softness / 100, 1));
  const inner = radius * (1 - softness * 0.9);
  const strength = Math.max(0.01, Math.min((layer.fade.brushStrength || 50) / 100, 1));
  const shape = layer.fade.brushShape || "round";

  if (shape === "square") {
    if (controls.brushEraser.checked) {
      mctx.globalCompositeOperation = "destination-out";
      mctx.fillStyle = `rgba(0,0,0,${strength})`;
    } else {
      mctx.globalCompositeOperation = "source-over";
      mctx.fillStyle = `rgba(255,255,255,${strength})`;
    }
    mctx.fillRect(mx - radius, my - radius, radius * 2, radius * 2);
  } else {
    const g = mctx.createRadialGradient(mx, my, inner, mx, my, radius);
    if (controls.brushEraser.checked) {
      mctx.globalCompositeOperation = "destination-out";
      g.addColorStop(0, `rgba(0,0,0,${strength})`);
      g.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      mctx.globalCompositeOperation = "source-over";
      g.addColorStop(0, `rgba(255,255,255,${strength})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
    }
    mctx.fillStyle = g;
    mctx.beginPath();
    mctx.arc(mx, my, radius, 0, Math.PI * 2);
    mctx.fill();
  }
  mctx.globalCompositeOperation = "source-over";
}

function loadFileAsImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ img, src: reader.result, name: file.name || "image" });
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function addFiles(fileList) {
  const files = [...(fileList || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;

  for (const file of files) {
    try {
      const loaded = await loadFileAsImage(file);
      const layer = createImageLayer(loaded.img, loaded.src, loaded.name, state.images.length);
      state.images.push(layer);
      state.activeImageId = layer.id;
    } catch {
      // ignore invalid file
    }
  }

  syncImageControls();
  renderImageList();
  render();
}

function removeActiveImage() {
  const index = state.images.findIndex((img) => img.id === state.activeImageId);
  if (index === -1) return;
  state.images.splice(index, 1);
  state.activeImageId = state.images.length ? state.images[state.images.length - 1].id : null;
  syncImageControls();
  renderImageList();
  render();
}

function duplicateActiveImage() {
  const active = getActiveImage();
  if (!active) return;
  const clone = {
    ...active,
    id: uid("img"),
    x: active.x + 20,
    y: active.y + 20,
    fade: { ...active.fade },
  };
  state.images.push(clone);
  state.activeImageId = clone.id;
  syncImageControls();
  renderImageList();
  render();
}

function moveActiveLayer(step) {
  const active = getActiveImage();
  if (!active) return;
  const index = state.images.findIndex((img) => img.id === active.id);
  if (index === -1) return;
  const next = index + step;
  if (next < 0 || next >= state.images.length) return;
  const temp = state.images[index];
  state.images[index] = state.images[next];
  state.images[next] = temp;
  renderImageList();
  render();
}

function moveActiveLayerToFront() {
  const active = getActiveImage();
  if (!active) return;
  const index = state.images.findIndex((img) => img.id === active.id);
  if (index < 0 || index === state.images.length - 1) return;
  state.images.splice(index, 1);
  state.images.push(active);
  renderImageList();
  render();
}

function moveActiveLayerToBack() {
  const active = getActiveImage();
  if (!active) return;
  const index = state.images.findIndex((img) => img.id === active.id);
  if (index <= 0) return;
  state.images.splice(index, 1);
  state.images.unshift(active);
  renderImageList();
  render();
}

function centerActiveImage() {
  const active = getActiveImage();
  if (!active) return;
  active.x = (state.canvas.width - active.width) / 2;
  active.y = (state.canvas.height - active.height) / 2;
  syncImageControls();
  render();
}

function fitActiveImageToCanvas() {
  const active = getActiveImage();
  if (!active) return;
  const scale = Math.min(state.canvas.width / active.naturalW, state.canvas.height / active.naturalH);
  active.scale = scale;
  active.width = active.naturalW * scale;
  active.height = active.naturalH * scale;
  centerActiveImage();
}

function updateActiveImageScale(percent) {
  const active = getActiveImage();
  if (!active) return;
  const cx = active.x + active.width / 2;
  const cy = active.y + active.height / 2;
  const scale = Math.max(0.05, percent / 100);
  active.scale = scale;
  active.width = active.naturalW * scale;
  active.height = active.naturalH * scale;
  active.x = cx - active.width / 2;
  active.y = cy - active.height / 2;
  syncImageControls();
  render();
}

function updateActiveImageSize({ width, height }) {
  const active = getActiveImage();
  if (!active) return;
  const ratio = active.naturalW / active.naturalH;
  if (controls.lockRatio.checked) {
    if (width != null) height = width / ratio;
    if (height != null && width == null) width = height * ratio;
  }
  if (width != null) active.width = Math.max(MIN_IMAGE_SIZE, width);
  if (height != null) active.height = Math.max(MIN_IMAGE_SIZE, height);
  active.scale = active.width / active.naturalW;
  syncImageControls();
  render();
}

function updateActiveImagePosition(x, y) {
  const active = getActiveImage();
  if (!active) return;
  active.x = x;
  active.y = y;
  syncImageControls();
  render();
}

function buildStops(softness, reverse) {
  const curve = 1 + softness * 2;
  const steps = [0, 0.2, 0.5, 0.8, 1];
  return steps.map((stop) => {
    const eased = Math.pow(stop, curve);
    return { stop, alpha: reverse ? 1 - eased : eased };
  });
}

function toRgba(hex, alpha) {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function buildMaskGradient(context, width, height, fade) {
  const fadeSize = Math.min(Math.max(fade.size / 100, 0), 1);
  const softness = Math.max(0, Math.min(fade.softness / 100, 1));
  const forwardStops = buildStops(softness, false);
  const reverseStops = buildStops(softness, true);

  if (fade.type === "radial") {
    const cx = width / 2;
    const cy = height / 2;
    const radius = (Math.hypot(width, height) / 2) * fadeSize;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    reverseStops.forEach((stop) => gradient.addColorStop(stop.stop, `rgba(0,0,0,${stop.alpha})`));
    return gradient;
  }

  if (fade.direction === "right") {
    const start = width - width * fadeSize;
    const gradient = context.createLinearGradient(start, 0, width, 0);
    reverseStops.forEach((stop) => gradient.addColorStop(stop.stop, `rgba(0,0,0,${stop.alpha})`));
    return gradient;
  }

  if (fade.direction === "top") {
    const gradient = context.createLinearGradient(0, 0, 0, height * fadeSize);
    forwardStops.forEach((stop) => gradient.addColorStop(stop.stop, `rgba(0,0,0,${stop.alpha})`));
    return gradient;
  }

  if (fade.direction === "bottom") {
    const start = height - height * fadeSize;
    const gradient = context.createLinearGradient(0, start, 0, height);
    reverseStops.forEach((stop) => gradient.addColorStop(stop.stop, `rgba(0,0,0,${stop.alpha})`));
    return gradient;
  }

  if (fade.direction === "both-x") {
    const edge = Math.min(fadeSize, 0.5);
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    forwardStops.forEach((stop) => {
      gradient.addColorStop(edge * stop.stop, `rgba(0,0,0,${stop.alpha})`);
    });
    gradient.addColorStop(1 - edge, "rgba(0,0,0,1)");
    [...forwardStops].reverse().forEach((stop) => {
      const pos = 1 - edge * stop.stop;
      gradient.addColorStop(pos, `rgba(0,0,0,${stop.alpha})`);
    });
    return gradient;
  }

  if (fade.direction === "both-y") {
    const edge = Math.min(fadeSize, 0.5);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    forwardStops.forEach((stop) => {
      gradient.addColorStop(edge * stop.stop, `rgba(0,0,0,${stop.alpha})`);
    });
    gradient.addColorStop(1 - edge, "rgba(0,0,0,1)");
    [...forwardStops].reverse().forEach((stop) => {
      const pos = 1 - edge * stop.stop;
      gradient.addColorStop(pos, `rgba(0,0,0,${stop.alpha})`);
    });
    return gradient;
  }

  const gradient = context.createLinearGradient(0, 0, width * fadeSize, 0);
  forwardStops.forEach((stop) => gradient.addColorStop(stop.stop, `rgba(0,0,0,${stop.alpha})`));
  return gradient;
}

function buildColorGradient(context, width, height, fade) {
  const fadeSize = Math.min(Math.max(fade.size / 100, 0), 1);
  const softness = Math.max(0, Math.min(fade.softness / 100, 1));
  const forwardStops = buildStops(softness, false);
  const reverseStops = buildStops(softness, true);

  if (fade.type === "radial") {
    const cx = width / 2;
    const cy = height / 2;
    const radius = (Math.hypot(width, height) / 2) * fadeSize;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    forwardStops.forEach((stop) => gradient.addColorStop(stop.stop, toRgba(fade.color, stop.alpha)));
    return gradient;
  }

  if (fade.direction === "right") {
    const start = width - width * fadeSize;
    const gradient = context.createLinearGradient(start, 0, width, 0);
    forwardStops.forEach((stop) => gradient.addColorStop(stop.stop, toRgba(fade.color, stop.alpha)));
    return gradient;
  }

  if (fade.direction === "top") {
    const gradient = context.createLinearGradient(0, 0, 0, height * fadeSize);
    reverseStops.forEach((stop) => gradient.addColorStop(stop.stop, toRgba(fade.color, stop.alpha)));
    return gradient;
  }

  if (fade.direction === "bottom") {
    const start = height - height * fadeSize;
    const gradient = context.createLinearGradient(0, start, 0, height);
    forwardStops.forEach((stop) => gradient.addColorStop(stop.stop, toRgba(fade.color, stop.alpha)));
    return gradient;
  }

  if (fade.direction === "both-x") {
    const edge = Math.min(fadeSize, 0.5);
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, toRgba(fade.color, 1));
    reverseStops.forEach((stop) => {
      gradient.addColorStop(edge * stop.stop, toRgba(fade.color, stop.alpha));
    });
    gradient.addColorStop(1 - edge, toRgba(fade.color, 0));
    [...reverseStops].reverse().forEach((stop) => {
      const pos = 1 - edge * stop.stop;
      gradient.addColorStop(pos, toRgba(fade.color, stop.alpha));
    });
    return gradient;
  }

  if (fade.direction === "both-y") {
    const edge = Math.min(fadeSize, 0.5);
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, toRgba(fade.color, 1));
    reverseStops.forEach((stop) => {
      gradient.addColorStop(edge * stop.stop, toRgba(fade.color, stop.alpha));
    });
    gradient.addColorStop(1 - edge, toRgba(fade.color, 0));
    [...reverseStops].reverse().forEach((stop) => {
      const pos = 1 - edge * stop.stop;
      gradient.addColorStop(pos, toRgba(fade.color, stop.alpha));
    });
    return gradient;
  }

  const gradient = context.createLinearGradient(0, 0, width * fadeSize, 0);
  reverseStops.forEach((stop) => gradient.addColorStop(stop.stop, toRgba(fade.color, stop.alpha)));
  return gradient;
}

function drawLayer(targetCtx, layer) {
  const { image, x, y, width, height, fade } = layer;
  if (fade.type === "brush") {
    if (fade.mode === "transparent") {
      const off = document.createElement("canvas");
      off.width = Math.round(width);
      off.height = Math.round(height);
      const octx = off.getContext("2d");
      octx.drawImage(image, 0, 0, off.width, off.height);
      if (layer.brushMask) {
        octx.globalCompositeOperation = "destination-out";
        octx.drawImage(layer.brushMask, 0, 0, off.width, off.height);
      }
      octx.globalCompositeOperation = "source-over";
      targetCtx.drawImage(off, x, y);
    } else {
      targetCtx.drawImage(image, x, y, width, height);
      if (!layer.brushMask) return;
      const tint = document.createElement("canvas");
      tint.width = Math.round(width);
      tint.height = Math.round(height);
      const tctx = tint.getContext("2d");
      tctx.fillStyle = fade.color;
      tctx.fillRect(0, 0, tint.width, tint.height);
      tctx.globalCompositeOperation = "destination-in";
      tctx.drawImage(layer.brushMask, 0, 0, tint.width, tint.height);
      tctx.globalCompositeOperation = "source-over";
      targetCtx.drawImage(tint, x, y);
    }
    return;
  }

  const fadeActive = fade.type !== "none" && fade.size > 0;

  if (!fadeActive || fade.mode === "color") {
    targetCtx.drawImage(image, x, y, width, height);
  }

  if (fadeActive && fade.mode === "transparent") {
    const off = document.createElement("canvas");
    off.width = Math.round(width);
    off.height = Math.round(height);
    const octx = off.getContext("2d");
    octx.drawImage(image, 0, 0, off.width, off.height);
    octx.globalCompositeOperation = "destination-in";
    octx.fillStyle = buildMaskGradient(octx, off.width, off.height, fade);
    octx.fillRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = "source-over";
    targetCtx.drawImage(off, x, y);
  }

  if (fadeActive && fade.mode === "color") {
    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.fillStyle = buildColorGradient(targetCtx, width, height, fade);
    targetCtx.fillRect(0, 0, width, height);
    targetCtx.restore();
  }
}

function drawHandles(layer) {
  if (!layer) return;
  const half = HANDLE_SIZE / 2;
  const points = [
    { x: layer.x, y: layer.y },
    { x: layer.x + layer.width, y: layer.y },
    { x: layer.x, y: layer.y + layer.height },
    { x: layer.x + layer.width, y: layer.y + layer.height },
  ];
  ctx.save();
  ctx.fillStyle = "#e27d39";
  ctx.strokeStyle = "#1b1714";
  ctx.lineWidth = 2;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.rect(point.x - half, point.y - half, HANDLE_SIZE, HANDLE_SIZE);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawBrushPreview() {
  const active = getActiveImage();
  if (!active || active.fade.type !== "brush") return;
  if (!state.pointer.inside || state.pointer.shift) return;

  const size = active.fade.brushSize || 90;
  const radius = size / 2;
  ctx.save();
  ctx.strokeStyle = "rgba(226,125,57,0.95)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);

  if ((active.fade.brushShape || "round") === "square") {
    ctx.strokeRect(state.pointer.x - radius, state.pointer.y - radius, radius * 2, radius * 2);
  } else {
    ctx.beginPath();
    ctx.arc(state.pointer.x, state.pointer.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.canvas.transparent) {
    ctx.fillStyle = state.canvas.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  controls.dropHint.style.opacity = state.images.length ? 0 : 1;
  state.images.forEach((layer) => drawLayer(ctx, layer));
  drawHandles(getActiveImage());
  drawBrushPreview();
}

function drawRulers() {
  const top = controls.rulerTop;
  const left = controls.rulerLeft;
  if (!top || !left) return;

  const wrapRect = controls.canvasWrap.getBoundingClientRect();
  const canvasRect = canvas.getBoundingClientRect();

  const topHeight = 24;
  const leftWidth = 44;

  top.width = Math.max(1, Math.floor(wrapRect.width - leftWidth));
  top.height = topHeight;
  left.width = leftWidth;
  left.height = Math.max(1, Math.floor(wrapRect.height - topHeight));

  const tctx = top.getContext("2d");
  const lctx = left.getContext("2d");
  tctx.clearRect(0, 0, top.width, top.height);
  lctx.clearRect(0, 0, left.width, left.height);

  tctx.fillStyle = "#17120f";
  tctx.fillRect(0, 0, top.width, top.height);
  lctx.fillStyle = "#17120f";
  lctx.fillRect(0, 0, left.width, left.height);

  const offsetX = canvasRect.left - wrapRect.left - leftWidth;
  const offsetY = canvasRect.top - wrapRect.top - topHeight;
  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;

  tctx.strokeStyle = "#6f6256";
  tctx.fillStyle = "#c8bdb3";
  tctx.font = "10px Space Grotesk";
  for (let x = 0; x <= canvas.width; x += 10) {
    const px = Math.round(offsetX + x * scaleX);
    if (px < 0 || px > top.width) continue;
    const long = x % 100 === 0;
    const mid = x % 50 === 0;
    const h = long ? 12 : mid ? 9 : 6;
    tctx.beginPath();
    tctx.moveTo(px + 0.5, topHeight);
    tctx.lineTo(px + 0.5, topHeight - h);
    tctx.stroke();
    if (long) tctx.fillText(String(x), px + 2, 9);
  }

  lctx.strokeStyle = "#6f6256";
  lctx.fillStyle = "#c8bdb3";
  lctx.font = "10px Space Grotesk";
  for (let y = 0; y <= canvas.height; y += 10) {
    const py = Math.round(offsetY + y * scaleY);
    if (py < 0 || py > left.height) continue;
    const long = y % 100 === 0;
    const mid = y % 50 === 0;
    const w = long ? 12 : mid ? 9 : 6;
    lctx.beginPath();
    lctx.moveTo(leftWidth, py + 0.5);
    lctx.lineTo(leftWidth - w, py + 0.5);
    lctx.stroke();
    if (long) lctx.fillText(String(y), 2, py - 2);
  }
}

function renderImageList() {
  controls.imageList.innerHTML = "";
  [...state.images].reverse().forEach((layer) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `image-item${layer.id === state.activeImageId ? " active" : ""}`;
    item.dataset.imageId = layer.id;

    const thumb = document.createElement("img");
    thumb.className = "image-item-thumb";
    thumb.src = layer.src;
    thumb.alt = layer.name;

    const name = document.createElement("span");
    name.className = "image-item-name";
    name.textContent = layer.name;

    item.append(thumb, name);
    controls.imageList.append(item);
  });
}

function getPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) * canvas.width) / rect.width,
    y: ((event.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function isTypingContext(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

function openShortcutModal() {
  controls.shortcutModal.classList.add("is-open");
  controls.shortcutModal.setAttribute("aria-hidden", "false");
}

function closeShortcutModal() {
  controls.shortcutModal.classList.remove("is-open");
  controls.shortcutModal.setAttribute("aria-hidden", "true");
}

function getHandleAtPoint(layer, x, y) {
  if (!layer) return null;
  const half = HANDLE_SIZE / 2;
  const handles = [
    { name: "nw", x: layer.x, y: layer.y },
    { name: "ne", x: layer.x + layer.width, y: layer.y },
    { name: "sw", x: layer.x, y: layer.y + layer.height },
    { name: "se", x: layer.x + layer.width, y: layer.y + layer.height },
  ];
  return handles.find(
    (h) => x >= h.x - half && x <= h.x + half && y >= h.y - half && y <= h.y + half
  );
}

function hitTestTopLayer(x, y) {
  for (let i = state.images.length - 1; i >= 0; i -= 1) {
    const layer = state.images[i];
    if (x >= layer.x && x <= layer.x + layer.width && y >= layer.y && y <= layer.y + layer.height) {
      return layer;
    }
  }
  return null;
}

function bringToFront(layer) {
  const index = state.images.findIndex((img) => img.id === layer.id);
  if (index === -1 || index === state.images.length - 1) return;
  state.images.splice(index, 1);
  state.images.push(layer);
}

function resizeFromHandle(layer, handle, x, y) {
  const ratio = layer.naturalW / layer.naturalH;
  const keepRatio = controls.lockRatio.checked;
  let anchorX = layer.x;
  let anchorY = layer.y;
  let ux = 0;
  let uy = 0;

  if (handle === "se") {
    anchorX = layer.x;
    anchorY = layer.y;
    ux = x - anchorX;
    uy = y - anchorY;
  } else if (handle === "sw") {
    anchorX = layer.x + layer.width;
    anchorY = layer.y;
    ux = anchorX - x;
    uy = y - anchorY;
  } else if (handle === "ne") {
    anchorX = layer.x;
    anchorY = layer.y + layer.height;
    ux = x - anchorX;
    uy = anchorY - y;
  } else {
    anchorX = layer.x + layer.width;
    anchorY = layer.y + layer.height;
    ux = anchorX - x;
    uy = anchorY - y;
  }

  let width = Math.max(MIN_IMAGE_SIZE, ux);
  let height = Math.max(MIN_IMAGE_SIZE, uy);

  if (keepRatio) {
    if (width / height > ratio) {
      height = width / ratio;
    } else {
      width = height * ratio;
    }
  }

  if (handle === "se") {
    layer.x = anchorX;
    layer.y = anchorY;
  } else if (handle === "sw") {
    layer.x = anchorX - width;
    layer.y = anchorY;
  } else if (handle === "ne") {
    layer.x = anchorX;
    layer.y = anchorY - height;
  } else {
    layer.x = anchorX - width;
    layer.y = anchorY - height;
  }

  layer.width = width;
  layer.height = height;
  layer.scale = layer.width / layer.naturalW;
}

function renderForExport(type) {
  const out = document.createElement("canvas");
  out.width = state.canvas.width;
  out.height = state.canvas.height;
  const octx = out.getContext("2d");

  if (!state.canvas.transparent || type === "jpg") {
    octx.fillStyle = state.canvas.bgColor;
    octx.fillRect(0, 0, out.width, out.height);
  }

  state.images.forEach((layer) => drawLayer(octx, layer));
  return out;
}

function downloadImage(type) {
  const out = renderForExport(type);
  const url = out.toDataURL(type === "png" ? "image/png" : "image/jpeg", 0.92);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${getExportBaseName()}.${type}`;
  link.click();
}

controls.applyCanvas.addEventListener("click", () => {
  const width = parseInt(controls.canvasWidth.value, 10);
  const height = parseInt(controls.canvasHeight.value, 10);
  if (!Number.isNaN(width) && !Number.isNaN(height)) setCanvasSize(width, height);
});

controls.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const [w, h] = button.dataset.preset.split("x").map(Number);
    setCanvasSize(w, h);
  });
});

controls.transparentBg.addEventListener("change", (event) => {
  state.canvas.transparent = event.target.checked;
  render();
});

controls.bgColor.addEventListener("input", (event) => {
  state.canvas.bgColor = event.target.value;
  controls.bgColorHex.value = state.canvas.bgColor;
  render();
});

controls.bgColorHex.addEventListener("change", (event) => {
  const hex = normalizeHex(event.target.value);
  if (!hex) {
    controls.bgColorHex.value = state.canvas.bgColor;
    return;
  }
  state.canvas.bgColor = hex;
  controls.bgColor.value = hex;
  controls.bgColorHex.value = hex;
  render();
});

controls.imageInput.addEventListener("change", async (event) => {
  await addFiles(event.target.files);
  event.target.value = "";
});

controls.imageList.addEventListener("click", (event) => {
  const item = event.target.closest(".image-item");
  if (!item) return;
  setActiveImage(item.dataset.imageId);
});

controls.removeImage.addEventListener("click", removeActiveImage);
controls.fitImage.addEventListener("click", fitActiveImageToCanvas);
controls.centerImage.addEventListener("click", centerActiveImage);

controls.imageX.addEventListener("change", () => {
  const active = getActiveImage();
  if (!active) return;
  const nextX = parseInt(controls.imageX.value, 10);
  if (Number.isNaN(nextX)) return;
  updateActiveImagePosition(nextX, active.y);
});

controls.imageY.addEventListener("change", () => {
  const active = getActiveImage();
  if (!active) return;
  const nextY = parseInt(controls.imageY.value, 10);
  if (Number.isNaN(nextY)) return;
  updateActiveImagePosition(active.x, nextY);
});

controls.imageWidth.addEventListener("change", () => {
  const value = parseInt(controls.imageWidth.value, 10);
  if (Number.isNaN(value)) return;
  updateActiveImageSize({ width: value });
});

controls.imageHeight.addEventListener("change", () => {
  const value = parseInt(controls.imageHeight.value, 10);
  if (Number.isNaN(value)) return;
  updateActiveImageSize({ height: value });
});

controls.imageScale.addEventListener("input", () => {
  const value = parseInt(controls.imageScale.value, 10);
  if (Number.isNaN(value)) return;
  updateActiveImageScale(value);
});

controls.fadeType.addEventListener("change", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.type = event.target.value;
  updateFadeModeUI();
  render();
});

controls.fadeDirection.addEventListener("change", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.direction = event.target.value;
  render();
});

controls.fadeTransparent.addEventListener("change", () => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.mode = controls.fadeTransparent.checked ? "transparent" : "color";
  updateFadeModeUI();
  render();
});

controls.fadeColor.addEventListener("input", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.color = event.target.value;
  controls.fadeColorHex.value = active.fade.color;
  render();
});

controls.fadeColorHex.addEventListener("change", (event) => {
  const active = getActiveImage();
  if (!active) return;
  const hex = normalizeHex(event.target.value);
  if (!hex) {
    controls.fadeColorHex.value = active.fade.color;
    return;
  }
  active.fade.color = hex;
  controls.fadeColor.value = hex;
  controls.fadeColorHex.value = hex;
  render();
});

controls.fadeSize.addEventListener("input", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.size = parseInt(event.target.value, 10);
  render();
});

controls.fadeSoftness.addEventListener("input", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.softness = parseInt(event.target.value, 10);
  render();
});

controls.brushSize.addEventListener("input", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.brushSize = parseInt(event.target.value, 10);
});

controls.brushStrength.addEventListener("input", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.brushStrength = parseInt(event.target.value, 10);
});

controls.brushShape.addEventListener("change", (event) => {
  const active = getActiveImage();
  if (!active) return;
  active.fade.brushShape = event.target.value;
  render();
});

controls.clearBrush.addEventListener("click", () => {
  const active = getActiveImage();
  if (!active) return;
  clearBrushMask(active);
  render();
});

controls.downloadPng.addEventListener("click", () => downloadImage("png"));
controls.downloadJpg.addEventListener("click", () => downloadImage("jpg"));
controls.openShortcuts.addEventListener("click", openShortcutModal);
controls.closeShortcuts.addEventListener("click", closeShortcutModal);
controls.closeShortcutsBtn.addEventListener("click", closeShortcutModal);

const toolButtons = [...document.querySelectorAll(".tool[data-target]")];
const panelGroups = [...document.querySelectorAll(".panel-group")];

function setActiveTool(targetId) {
  toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.target === targetId);
  });
}

function setPanelVisibility(targetId) {
  panelGroups.forEach((group) => {
    group.classList.toggle("is-hidden", group.id !== targetId);
  });
}

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    setActiveTool(targetId);
    setPanelVisibility(targetId);
  });
});

canvas.addEventListener("mousedown", (event) => {
  const pointer = getPointer(event);
  state.pointer.x = pointer.x;
  state.pointer.y = pointer.y;
  state.pointer.shift = event.shiftKey;
  const active = getActiveImage();
  const brushShiftMove =
    !!active && active.fade.type === "brush" && event.shiftKey;

  if (active && active.fade.type === "brush" && !brushShiftMove) {
    const hit = hitTestTopLayer(pointer.x, pointer.y);
    if (!hit) return;
    bringToFront(hit);
    setActiveImage(hit.id);
    const selected = getActiveImage();
    if (!selected || selected.fade.type !== "brush") return;
    state.drag.active = true;
    state.drag.mode = "brush";
    state.drag.lastBrushX = pointer.x;
    state.drag.lastBrushY = pointer.y;
    paintBrushAt(selected, pointer.x, pointer.y);
    canvas.style.cursor = "crosshair";
    requestRender();
    return;
  }

  if (active) {
    const handle = getHandleAtPoint(active, pointer.x, pointer.y);
    if (handle) {
      state.drag.active = true;
      state.drag.mode = "resize";
      state.drag.handle = handle.name;
      canvas.style.cursor = "nwse-resize";
      return;
    }
  }

  const hit = hitTestTopLayer(pointer.x, pointer.y);
  if (!hit) return;

  bringToFront(hit);
  setActiveImage(hit.id);
  state.drag.active = true;
  state.drag.mode = "move";
  state.drag.offsetX = pointer.x - hit.x;
  state.drag.offsetY = pointer.y - hit.y;
  canvas.style.cursor = "grabbing";
});

window.addEventListener("mousemove", (event) => {
  const active = getActiveImage();
  if (!active) return;
  const pointer = getPointer(event);
  state.pointer.x = pointer.x;
  state.pointer.y = pointer.y;
  state.pointer.shift = event.shiftKey;

  if (state.drag.active && state.drag.mode === "brush") {
    const dx = pointer.x - state.drag.lastBrushX;
    const dy = pointer.y - state.drag.lastBrushY;
    if (dx * dx + dy * dy < 1) {
      requestRender();
      return;
    }
    state.drag.lastBrushX = pointer.x;
    state.drag.lastBrushY = pointer.y;
    paintBrushAt(active, pointer.x, pointer.y);
    requestRender();
    return;
  }

  if (state.drag.active && state.drag.mode === "move") {
    active.x = pointer.x - state.drag.offsetX;
    active.y = pointer.y - state.drag.offsetY;
    syncImageControls();
    requestRender();
    return;
  }

  if (state.drag.active && state.drag.mode === "resize") {
    resizeFromHandle(active, state.drag.handle, pointer.x, pointer.y);
    syncImageControls();
    requestRender();
    return;
  }

  const handle = getHandleAtPoint(active, pointer.x, pointer.y);
  if (handle) {
    canvas.style.cursor = "nwse-resize";
    return;
  }

  const hover =
    pointer.x >= active.x &&
    pointer.x <= active.x + active.width &&
    pointer.y >= active.y &&
    pointer.y <= active.y + active.height;
  if (active.fade.type === "brush") {
    canvas.style.cursor = hover ? (event.shiftKey ? "grab" : "crosshair") : "default";
    requestRender();
  } else {
    canvas.style.cursor = hover ? "grab" : "default";
  }
});

canvas.addEventListener("mouseenter", () => {
  state.pointer.inside = true;
  requestRender();
});

canvas.addEventListener("mouseleave", () => {
  state.pointer.inside = false;
  requestRender();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && controls.shortcutModal.classList.contains("is-open")) {
    closeShortcutModal();
    return;
  }

  if ((event.key === "?" || ((event.ctrlKey || event.metaKey) && event.key === "/")) && !isTypingContext(event.target)) {
    event.preventDefault();
    if (controls.shortcutModal.classList.contains("is-open")) {
      closeShortcutModal();
    } else {
      openShortcutModal();
    }
    return;
  }

  if (isTypingContext(event.target)) return;
  const active = getActiveImage();
  if (!active) return;

  const mod = event.ctrlKey || event.metaKey;

  if (active.fade.type === "brush" && (event.key === "e" || event.key === "E") && !mod) {
    event.preventDefault();
    controls.brushEraser.checked = !controls.brushEraser.checked;
    requestRender();
    return;
  }

  if (active.fade.type === "brush") {
    if (event.key === "]") {
      event.preventDefault();
      const amount = event.shiftKey ? 5 : 8;
      if (event.shiftKey) {
        active.fade.softness = Math.max(0, Math.min(100, active.fade.softness + amount));
        controls.fadeSoftness.value = active.fade.softness;
      } else {
        active.fade.brushSize = Math.max(10, Math.min(300, active.fade.brushSize + amount));
        controls.brushSize.value = active.fade.brushSize;
      }
      requestRender();
      return;
    }
    if (event.key === "[") {
      event.preventDefault();
      const amount = event.shiftKey ? -5 : -8;
      if (event.shiftKey) {
        active.fade.softness = Math.max(0, Math.min(100, active.fade.softness + amount));
        controls.fadeSoftness.value = active.fade.softness;
      } else {
        active.fade.brushSize = Math.max(10, Math.min(300, active.fade.brushSize + amount));
        controls.brushSize.value = active.fade.brushSize;
      }
      requestRender();
      return;
    }
  }

  if ((event.key === "Delete" || event.key === "Backspace") && !mod) {
    event.preventDefault();
    removeActiveImage();
    return;
  }

  if (mod && event.key.toLowerCase() === "d") {
    event.preventDefault();
    duplicateActiveImage();
    return;
  }

  if (mod && event.key.toLowerCase() === "j") {
    event.preventDefault();
    duplicateActiveImage();
    return;
  }

  if (mod && event.shiftKey && event.key === "]") {
    event.preventDefault();
    moveActiveLayerToFront();
    return;
  }

  if (mod && event.key === "]") {
    event.preventDefault();
    moveActiveLayer(1);
    return;
  }

  if (mod && event.shiftKey && event.key === "[") {
    event.preventDefault();
    moveActiveLayerToBack();
    return;
  }

  if (mod && event.key === "[") {
    event.preventDefault();
    moveActiveLayer(-1);
    return;
  }

  if (mod && event.key === "0") {
    event.preventDefault();
    fitActiveImageToCanvas();
    return;
  }

  if (mod && (event.key === "+" || event.key === "=")) {
    event.preventDefault();
    updateActiveImageScale(Math.round(active.scale * 100) + 5);
    return;
  }

  if (mod && event.key === "-") {
    event.preventDefault();
    updateActiveImageScale(Math.round(active.scale * 100) - 5);
    return;
  }

  const step = event.shiftKey ? 10 : 1;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    updateActiveImagePosition(active.x - step, active.y);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    updateActiveImagePosition(active.x + step, active.y);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    updateActiveImagePosition(active.x, active.y - step);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    updateActiveImagePosition(active.x, active.y + step);
  }
});

window.addEventListener("mouseup", () => {
  state.drag.active = false;
  state.drag.mode = "move";
  state.drag.handle = null;
  state.drag.lastBrushX = 0;
  state.drag.lastBrushY = 0;
});

controls.canvasWrap.addEventListener("dragover", (event) => {
  event.preventDefault();
});

controls.canvasWrap.addEventListener("drop", async (event) => {
  event.preventDefault();
  await addFiles(event.dataTransfer.files);
});

controls.dropHint.addEventListener("click", () => {
  controls.imageInput.click();
});

window.addEventListener("resize", () => {
  drawRulers();
});

if ("ResizeObserver" in window) {
  const ro = new ResizeObserver(() => drawRulers());
  ro.observe(controls.canvasWrap);
}


setActiveTool("section-canvas");
setPanelVisibility("section-canvas");
controls.canvasInfo.textContent = `${canvas.width} × ${canvas.height}`;
controls.bgColorHex.value = controls.bgColor.value;
syncImageControls();
render();
drawRulers();
