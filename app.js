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
  downloadPng: document.getElementById("downloadPng"),
  downloadZip: document.getElementById("downloadZip"),
  downloadJpg: document.getElementById("downloadJpg"),
  downloadPngPanel: document.getElementById("downloadPngPanel"),
  downloadZipPanel: document.getElementById("downloadZipPanel"),
  downloadJpgPanel: document.getElementById("downloadJpgPanel"),
  addPage: document.getElementById("addPage"),
  duplicatePage: document.getElementById("duplicatePage"),
  deletePage: document.getElementById("deletePage"),
  pagesList: document.getElementById("pagesList"),
  dropHint: document.getElementById("dropHint"),
  canvasInfo: document.getElementById("canvasInfo"),
  canvasWrap: document.getElementById("canvasWrap"),
};

const HANDLE_SIZE = 12;
const MIN_IMAGE_SIZE = 20;
const DEFAULT_CANVAS = {
  width: canvas.width,
  height: canvas.height,
  transparent: true,
  bgColor: "#ffffff",
};
const DEFAULT_FADE = {
  type: "linear",
  direction: "left",
  mode: "transparent",
  color: "#ffffff",
  size: 40,
  softness: 40,
};

const state = {
  pages: [],
  currentPageId: null,
  thumbnailTimer: null,
  isLoading: false,
  canvas: { ...DEFAULT_CANVAS },
  image: null,
  fade: { ...DEFAULT_FADE },
  drag: {
    active: false,
    offsetX: 0,
    offsetY: 0,
    mode: "move",
    handle: null,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
    startMouseX: 0,
    startMouseY: 0,
  },
};

function createPage(name) {
  return {
    id: `page-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    canvas: { ...DEFAULT_CANVAS },
    fade: { ...DEFAULT_FADE },
    image: null,
    thumbnail: null,
  };
}

function getCurrentPage() {
  return state.pages.find((page) => page.id === state.currentPageId);
}

function persistCurrentPage() {
  const page = getCurrentPage();
  if (!page) return;
  page.canvas = { ...state.canvas };
  page.fade = { ...state.fade };
  if (state.isLoading) {
    return;
  }
  if (state.image) {
    page.image = {
      src: state.image.src,
      x: state.image.x,
      y: state.image.y,
      width: state.image.width,
      height: state.image.height,
      scale: state.image.scale,
      naturalW: state.image.naturalW,
      naturalH: state.image.naturalH,
    };
  } else {
    page.image = null;
  }
}

function applyPageToState(page) {
  if (!page) return;
  state.canvas = { ...page.canvas };
  state.fade = { ...page.fade };
  setCanvasSize(state.canvas.width, state.canvas.height, false);
  syncControlsFromState();

  if (!page.image) {
    state.isLoading = false;
    state.image = null;
    syncImageInputs();
    updateImageControlState();
    render();
    return;
  }

  state.isLoading = true;
  state.image = null;
  render();
  const img = new Image();
  img.onload = () => {
    const naturalW = page.image.naturalW || img.naturalWidth || img.width;
    const naturalH = page.image.naturalH || img.naturalHeight || img.height;
    state.image = {
      image: img,
      src: page.image.src,
      naturalW,
      naturalH,
      x: page.image.x,
      y: page.image.y,
      width: page.image.width,
      height: page.image.height,
      scale: page.image.scale || page.image.width / naturalW,
    };
    state.isLoading = false;
    syncImageInputs();
    updateImageControlState();
    render();
  };
  img.src = page.image.src;
}

function syncControlsFromState() {
  controls.canvasWidth.value = state.canvas.width;
  controls.canvasHeight.value = state.canvas.height;
  controls.transparentBg.checked = state.canvas.transparent;
  controls.bgColor.value = state.canvas.bgColor;
  controls.bgColorHex.value = state.canvas.bgColor;
  controls.fadeType.value = state.fade.type;
  controls.fadeDirection.value = state.fade.direction;
  controls.fadeTransparent.checked = state.fade.mode === "transparent";
  controls.fadeColor.value = state.fade.color;
  controls.fadeColorHex.value = state.fade.color;
  controls.fadeSize.value = state.fade.size;
  controls.fadeSoftness.value = state.fade.softness;
  controls.fadeDirection.disabled =
    state.fade.type === "radial" || state.fade.type === "none";
  updateFadeModeUI();
}

function updateFadeModeUI() {
  const transparent = controls.fadeTransparent.checked;
  state.fade.mode = transparent ? "transparent" : "color";
  controls.fadeColor.disabled = transparent;
  controls.fadeColorHex.disabled = transparent;
  if (controls.fadeColorWrap) {
    controls.fadeColorWrap.style.display = transparent ? "none" : "flex";
  }
}

function renderPagesList() {
  if (!controls.pagesList) return;
  controls.pagesList.innerHTML = "";
  state.pages.forEach((page, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `page-card${page.id === state.currentPageId ? " active" : ""}`;
    card.dataset.pageId = page.id;

    const thumb = document.createElement("div");
    thumb.className = "page-thumb";
    if (page.thumbnail) {
      thumb.style.backgroundImage = `url(${page.thumbnail})`;
    }

    const info = document.createElement("div");
    info.className = "page-info";
    const title = document.createElement("strong");
    title.textContent = page.name || `Page ${index + 1}`;
    const meta = document.createElement("span");
    meta.textContent = `${page.canvas.width} × ${page.canvas.height}`;
    info.append(title, meta);

    card.append(thumb, info);
    controls.pagesList.append(card);
  });
}

function scheduleThumbnailUpdate() {
  if (!state.currentPageId) return;
  clearTimeout(state.thumbnailTimer);
  state.thumbnailTimer = setTimeout(() => {
    const page = getCurrentPage();
    if (!page) return;
    page.thumbnail = buildThumbnail();
    renderPagesList();
  }, 250);
}

function buildThumbnail() {
  const source = renderCurrentPageToCanvas("png");
  const thumb = document.createElement("canvas");
  const ratio = source.width / source.height;
  thumb.width = 180;
  thumb.height = Math.round(thumb.width / ratio);
  const tctx = thumb.getContext("2d");
  tctx.drawImage(source, 0, 0, thumb.width, thumb.height);
  return thumb.toDataURL("image/png");
}

function switchToPage(pageId) {
  if (pageId === state.currentPageId) return;
  persistCurrentPage();
  state.currentPageId = pageId;
  applyPageToState(getCurrentPage());
  renderPagesList();
}

function addNewPage() {
  persistCurrentPage();
  const page = createPage(`Page ${state.pages.length + 1}`);
  page.canvas = { ...state.canvas };
  page.fade = { ...state.fade };
  state.pages.push(page);
  state.currentPageId = page.id;
  applyPageToState(page);
  renderPagesList();
}

function duplicateCurrentPage() {
  const current = getCurrentPage();
  if (!current) return;
  persistCurrentPage();
  const clone = {
    id: `page-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `Page ${state.pages.length + 1}`,
    canvas: { ...current.canvas },
    fade: { ...current.fade },
    image: current.image ? { ...current.image } : null,
    thumbnail: current.thumbnail,
  };
  state.pages.push(clone);
  state.currentPageId = clone.id;
  applyPageToState(clone);
  renderPagesList();
}

function deleteCurrentPage() {
  if (state.pages.length <= 1) return;
  const index = state.pages.findIndex((page) => page.id === state.currentPageId);
  if (index === -1) return;
  state.pages.splice(index, 1);
  const nextIndex = Math.max(0, index - 1);
  state.currentPageId = state.pages[nextIndex].id;
  applyPageToState(getCurrentPage());
  renderPagesList();
}

function initPages() {
  const first = createPage("Page 1");
  state.pages = [first];
  state.currentPageId = first.id;
  applyPageToState(first);
  renderPagesList();
  if (controls.downloadZip) {
    controls.downloadZip.disabled = typeof JSZip === "undefined";
  }
  if (controls.downloadZipPanel) {
    controls.downloadZipPanel.disabled = typeof JSZip === "undefined";
  }
  setActiveTool("section-canvas");
  setPanelVisibility("section-canvas");
}

function syncCanvasInfo() {
  controls.canvasInfo.textContent = `${state.canvas.width} × ${state.canvas.height}`;
}

function setCanvasSize(width, height, shouldRender = true) {
  state.canvas.width = width;
  state.canvas.height = height;
  canvas.width = width;
  canvas.height = height;
  controls.canvasWidth.value = width;
  controls.canvasHeight.value = height;
  syncCanvasInfo();
  if (shouldRender) {
    render();
  }
}

function setImage(image, src) {
  const naturalW = image.naturalWidth || image.width;
  const naturalH = image.naturalHeight || image.height;
  state.isLoading = false;
  state.image = {
    image,
    src,
    naturalW,
    naturalH,
    x: 0,
    y: 0,
    scale: 1,
    width: naturalW,
    height: naturalH,
  };
  fitImageToCanvas();
}

function fitImageToCanvas() {
  if (!state.image) return;
  const scale = Math.min(
    state.canvas.width / state.image.naturalW,
    state.canvas.height / state.image.naturalH
  );
  updateImageScale(scale * 100);
  centerImage();
}

function centerImage() {
  if (!state.image) return;
  state.image.x = (state.canvas.width - state.image.width) / 2;
  state.image.y = (state.canvas.height - state.image.height) / 2;
  syncImageInputs();
  render();
}

function updateImageScale(percent) {
  if (!state.image) return;
  const centerX = state.image.x + state.image.width / 2;
  const centerY = state.image.y + state.image.height / 2;
  const scale = Math.max(0.05, percent / 100);
  state.image.scale = scale;
  state.image.width = state.image.naturalW * scale;
  state.image.height = state.image.naturalH * scale;
  state.image.x = centerX - state.image.width / 2;
  state.image.y = centerY - state.image.height / 2;
  controls.imageScale.value = Math.round(scale * 100);
  syncImageInputs();
  render();
}

function updateImageSize({ width, height }) {
  if (!state.image) return;
  const ratio = state.image.naturalW / state.image.naturalH;
  if (controls.lockRatio.checked) {
    if (width != null) {
      height = width / ratio;
    } else if (height != null) {
      width = height * ratio;
    }
  }
  if (width != null) state.image.width = Math.max(1, width);
  if (height != null) state.image.height = Math.max(1, height);
  state.image.scale = state.image.width / state.image.naturalW;
  controls.imageScale.value = Math.round(state.image.scale * 100);
  syncImageInputs();
  render();
}

function updateImagePosition(x, y) {
  if (!state.image) return;
  state.image.x = x;
  state.image.y = y;
  syncImageInputs();
  render();
}

function applyResize({ width, height, x, y }) {
  if (!state.image) return;
  state.image.width = Math.max(MIN_IMAGE_SIZE, width);
  state.image.height = Math.max(MIN_IMAGE_SIZE, height);
  state.image.x = x;
  state.image.y = y;
  state.image.scale = state.image.width / state.image.naturalW;
  controls.imageScale.value = Math.round(state.image.scale * 100);
  syncImageInputs();
  render();
}

function syncImageInputs() {
  if (!state.image) {
    controls.imageX.value = "";
    controls.imageY.value = "";
    controls.imageWidth.value = "";
    controls.imageHeight.value = "";
    controls.imageScale.value = 100;
    return;
  }
  controls.imageX.value = Math.round(state.image.x);
  controls.imageY.value = Math.round(state.image.y);
  controls.imageWidth.value = Math.round(state.image.width);
  controls.imageHeight.value = Math.round(state.image.height);
  controls.imageScale.value = Math.round(state.image.scale * 100);
}

function updateImageControlState() {
  const disabled = !state.image;
  controls.fitImage.disabled = disabled;
  controls.centerImage.disabled = disabled;
  controls.imageX.disabled = disabled;
  controls.imageY.disabled = disabled;
  controls.imageWidth.disabled = disabled;
  controls.imageHeight.disabled = disabled;
  controls.imageScale.disabled = disabled;
  controls.lockRatio.disabled = disabled;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!state.canvas.transparent) {
    ctx.fillStyle = state.canvas.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (!state.image) {
    controls.dropHint.style.opacity = 1;
    updateImageControlState();
    persistCurrentPage();
    scheduleThumbnailUpdate();
    return;
  }

  controls.dropHint.style.opacity = 0;
  const { image, x, y, width, height } = state.image;
  const fadeActive = state.fade.type !== "none" && state.fade.size > 0;

  if (!fadeActive || state.fade.mode === "color") {
    ctx.drawImage(image, x, y, width, height);
  }

  if (fadeActive && state.fade.mode === "transparent") {
    const off = document.createElement("canvas");
    off.width = Math.round(width);
    off.height = Math.round(height);
    const octx = off.getContext("2d");
    octx.drawImage(image, 0, 0, off.width, off.height);
    octx.globalCompositeOperation = "destination-in";
    octx.fillStyle = buildMaskGradient(octx, off.width, off.height, state.fade);
    octx.fillRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = "source-over";
    ctx.drawImage(off, x, y);
  }

  if (fadeActive && state.fade.mode === "color") {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = buildColorGradient(ctx, width, height, state.fade);
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawHandles();
  updateImageControlState();
  persistCurrentPage();
  scheduleThumbnailUpdate();
}

function drawHandles() {
  if (!state.image) return;
  const { x, y, width, height } = state.image;
  const size = HANDLE_SIZE;
  const half = size / 2;
  const points = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x, y: y + height },
    { x: x + width, y: y + height },
  ];
  ctx.save();
  ctx.fillStyle = "#e27d39";
  ctx.strokeStyle = "#1b1714";
  ctx.lineWidth = 2;
  points.forEach((point) => {
    ctx.beginPath();
    ctx.rect(point.x - half, point.y - half, size, size);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function getHandleAtPoint(x, y) {
  if (!state.image) return null;
  const { x: ix, y: iy, width, height } = state.image;
  const half = HANDLE_SIZE / 2;
  const handles = [
    { name: "nw", x: ix, y: iy },
    { name: "ne", x: ix + width, y: iy },
    { name: "sw", x: ix, y: iy + height },
    { name: "se", x: ix + width, y: iy + height },
  ];
  return handles.find(
    (handle) =>
      x >= handle.x - half &&
      x <= handle.x + half &&
      y >= handle.y - half &&
      y <= handle.y + half
  );
}

function buildMaskGradient(context, width, height, fade) {
  const fadeSize = Math.min(Math.max(fade.size / 100, 0), 1);
  const softness = Math.max(0, Math.min(fade.softness / 100, 1));
  const forwardStops = buildStops(softness, false);
  const reverseStops = buildStops(softness, true);

  if (fade.type === "radial") {
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.hypot(width, height) / 2;
    const radius = maxRadius * fadeSize;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    reverseStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, `rgba(0, 0, 0, ${stop.alpha})`);
    });
    return gradient;
  }

  if (fade.direction === "right") {
    const start = width - width * fadeSize;
    const gradient = context.createLinearGradient(start, 0, width, 0);
    reverseStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, `rgba(0, 0, 0, ${stop.alpha})`);
    });
    return gradient;
  }

  if (fade.direction === "top") {
    const gradient = context.createLinearGradient(0, 0, 0, height * fadeSize);
    forwardStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, `rgba(0, 0, 0, ${stop.alpha})`);
    });
    return gradient;
  }

  if (fade.direction === "bottom") {
    const start = height - height * fadeSize;
    const gradient = context.createLinearGradient(0, start, 0, height);
    reverseStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, `rgba(0, 0, 0, ${stop.alpha})`);
    });
    return gradient;
  }

  const gradient = context.createLinearGradient(0, 0, width * fadeSize, 0);
  forwardStops.forEach((stop) => {
    gradient.addColorStop(stop.stop, `rgba(0, 0, 0, ${stop.alpha})`);
  });
  return gradient;
}

function buildColorGradient(context, width, height, fade) {
  const fadeSize = Math.min(Math.max(fade.size / 100, 0), 1);
  const softness = Math.max(0, Math.min(fade.softness / 100, 1));
  const forwardStops = buildStops(softness, false);
  const reverseStops = buildStops(softness, true);
  const color = fade.color;

  if (fade.type === "radial") {
    const cx = width / 2;
    const cy = height / 2;
    const maxRadius = Math.hypot(width, height) / 2;
    const radius = maxRadius * fadeSize;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    forwardStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, toRgba(color, stop.alpha));
    });
    return gradient;
  }

  if (fade.direction === "right") {
    const start = width - width * fadeSize;
    const gradient = context.createLinearGradient(start, 0, width, 0);
    forwardStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, toRgba(color, stop.alpha));
    });
    return gradient;
  }

  if (fade.direction === "top") {
    const gradient = context.createLinearGradient(0, 0, 0, height * fadeSize);
    reverseStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, toRgba(color, stop.alpha));
    });
    return gradient;
  }

  if (fade.direction === "bottom") {
    const start = height - height * fadeSize;
    const gradient = context.createLinearGradient(0, start, 0, height);
    forwardStops.forEach((stop) => {
      gradient.addColorStop(stop.stop, toRgba(color, stop.alpha));
    });
    return gradient;
  }

  const gradient = context.createLinearGradient(0, 0, width * fadeSize, 0);
  reverseStops.forEach((stop) => {
    gradient.addColorStop(stop.stop, toRgba(color, stop.alpha));
  });
  return gradient;
}

function buildStops(softness, reverse) {
  const curve = 1 + softness * 2;
  const steps = [0, 0.2, 0.5, 0.8, 1];
  return steps.map((stop) => {
    const eased = Math.pow(stop, curve);
    const alpha = reverse ? 1 - eased : eased;
    return { stop, alpha };
  });
}

function toRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeHex(value) {
  if (!value) return null;
  let hex = value.trim();
  if (!hex.startsWith("#")) {
    hex = `#${hex}`;
  }
  const short = /^#([0-9a-fA-F]{3})$/;
  const full = /^#([0-9a-fA-F]{6})$/;
  if (short.test(hex)) {
    const m = hex.slice(1);
    return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`.toLowerCase();
  }
  if (full.test(hex)) {
    return hex.toLowerCase();
  }
  return null;
}

function handleFile(file) {
  if (!file) return;
  state.isLoading = true;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    const src = reader.result;
    img.onload = () => {
      setImage(img, src);
      state.isLoading = false;
      updateImageControlState();
      render();
    };
    img.src = src;
  };
  reader.readAsDataURL(file);
}

function downloadImage(type) {
  const exportCanvas = renderCurrentPageToCanvas(type);
  const url = exportCanvas.toDataURL(
    type === "png" ? "image/png" : "image/jpeg",
    0.92
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `fade-export.${type}`;
  link.click();
}

function loadImageFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawPageToContext(targetCtx, page, imageElement, format) {
  const width = page.canvas.width;
  const height = page.canvas.height;
  targetCtx.clearRect(0, 0, width, height);
  const fillBackground = !page.canvas.transparent || format === "jpg";
  if (fillBackground) {
    targetCtx.fillStyle = page.canvas.bgColor;
    targetCtx.fillRect(0, 0, width, height);
  }

  if (!page.image || !imageElement) return;

  const { x, y, width: imgW, height: imgH } = page.image;
  const fadeActive = page.fade.type !== "none" && page.fade.size > 0;

  if (!fadeActive || page.fade.mode === "color") {
    targetCtx.drawImage(imageElement, x, y, imgW, imgH);
  }

  if (fadeActive && page.fade.mode === "transparent") {
    const off = document.createElement("canvas");
    off.width = Math.round(imgW);
    off.height = Math.round(imgH);
    const octx = off.getContext("2d");
    octx.drawImage(imageElement, 0, 0, off.width, off.height);
    octx.globalCompositeOperation = "destination-in";
    octx.fillStyle = buildMaskGradient(octx, off.width, off.height, page.fade);
    octx.fillRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = "source-over";
    targetCtx.drawImage(off, x, y);
  }

  if (fadeActive && page.fade.mode === "color") {
    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.fillStyle = buildColorGradient(targetCtx, imgW, imgH, page.fade);
    targetCtx.fillRect(0, 0, imgW, imgH);
    targetCtx.restore();
  }
}

function renderCurrentPageToCanvas(format) {
  persistCurrentPage();
  const page = getCurrentPage();
  if (!page) return canvas;
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = page.canvas.width;
  exportCanvas.height = page.canvas.height;
  const ectx = exportCanvas.getContext("2d");
  drawPageToContext(ectx, page, state.image ? state.image.image : null, format);
  return exportCanvas;
}

async function downloadZip() {
  if (typeof JSZip === "undefined") return;
  persistCurrentPage();
  const zip = new JSZip();
  const pages = state.pages;
  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = page.canvas.width;
    exportCanvas.height = page.canvas.height;
    const ectx = exportCanvas.getContext("2d");

    if (page.image && page.image.src) {
      const img = await loadImageFromSrc(page.image.src);
      drawPageToContext(ectx, page, img, "png");
    } else {
      drawPageToContext(ectx, page, null, "png");
    }

    const dataUrl = exportCanvas.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    const safeName = (page.name || `page-${index + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    zip.file(`${index + 1}-${safeName}.png`, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "fade-pages.zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

controls.applyCanvas.addEventListener("click", () => {
  const width = parseInt(controls.canvasWidth.value, 10);
  const height = parseInt(controls.canvasHeight.value, 10);
  if (!Number.isNaN(width) && !Number.isNaN(height)) {
    setCanvasSize(width, height);
  }
});

controls.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const [w, h] = button.dataset.preset.split("x").map(Number);
    controls.canvasWidth.value = w;
    controls.canvasHeight.value = h;
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

controls.imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  handleFile(file);
  event.target.value = "";
});

controls.fitImage.addEventListener("click", fitImageToCanvas);
controls.centerImage.addEventListener("click", centerImage);

controls.imageX.addEventListener("change", () => {
  if (!state.image) return;
  const nextX = parseInt(controls.imageX.value, 10);
  if (Number.isNaN(nextX)) return;
  updateImagePosition(nextX, state.image.y);
});

controls.imageY.addEventListener("change", () => {
  if (!state.image) return;
  const nextY = parseInt(controls.imageY.value, 10);
  if (Number.isNaN(nextY)) return;
  updateImagePosition(state.image.x, nextY);
});

controls.imageWidth.addEventListener("change", () => {
  const nextWidth = parseInt(controls.imageWidth.value, 10);
  if (Number.isNaN(nextWidth)) return;
  updateImageSize({ width: nextWidth });
});

controls.imageHeight.addEventListener("change", () => {
  const nextHeight = parseInt(controls.imageHeight.value, 10);
  if (Number.isNaN(nextHeight)) return;
  updateImageSize({ height: nextHeight });
});

controls.imageScale.addEventListener("input", () => {
  const nextScale = parseInt(controls.imageScale.value, 10);
  if (Number.isNaN(nextScale)) return;
  updateImageScale(nextScale);
});

controls.fadeType.addEventListener("change", (event) => {
  state.fade.type = event.target.value;
  controls.fadeDirection.disabled = state.fade.type === "radial" || state.fade.type === "none";
  render();
});

controls.fadeDirection.addEventListener("change", (event) => {
  state.fade.direction = event.target.value;
  render();
});

controls.fadeTransparent.addEventListener("change", () => {
  updateFadeModeUI();
  render();
});

controls.fadeColor.addEventListener("input", (event) => {
  state.fade.color = event.target.value;
  controls.fadeColorHex.value = state.fade.color;
  render();
});

controls.fadeColorHex.addEventListener("change", (event) => {
  const hex = normalizeHex(event.target.value);
  if (!hex) {
    controls.fadeColorHex.value = state.fade.color;
    return;
  }
  state.fade.color = hex;
  controls.fadeColor.value = hex;
  controls.fadeColorHex.value = hex;
  render();
});

controls.fadeSize.addEventListener("input", (event) => {
  state.fade.size = parseInt(event.target.value, 10);
  render();
});

controls.fadeSoftness.addEventListener("input", (event) => {
  state.fade.softness = parseInt(event.target.value, 10);
  render();
});

if (controls.downloadPng) {
  controls.downloadPng.addEventListener("click", () => downloadImage("png"));
}
if (controls.downloadZip) {
  controls.downloadZip.addEventListener("click", downloadZip);
}
if (controls.downloadJpg) {
  controls.downloadJpg.addEventListener("click", () => downloadImage("jpg"));
}
if (controls.downloadPngPanel) {
  controls.downloadPngPanel.addEventListener("click", () => downloadImage("png"));
}
if (controls.downloadZipPanel) {
  controls.downloadZipPanel.addEventListener("click", downloadZip);
}
if (controls.downloadJpgPanel) {
  controls.downloadJpgPanel.addEventListener("click", () => downloadImage("jpg"));
}

if (controls.addPage) {
  controls.addPage.addEventListener("click", addNewPage);
}
if (controls.duplicatePage) {
  controls.duplicatePage.addEventListener("click", duplicateCurrentPage);
}
if (controls.deletePage) {
  controls.deletePage.addEventListener("click", deleteCurrentPage);
}

if (controls.pagesList) {
  controls.pagesList.addEventListener("click", (event) => {
    const card = event.target.closest(".page-card");
    if (!card) return;
    switchToPage(card.dataset.pageId);
  });
}

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
  if (!state.image) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const handle = getHandleAtPoint(x, y);
  if (handle) {
    state.drag.active = true;
    state.drag.mode = "resize";
    state.drag.handle = handle.name;
    state.drag.startX = state.image.x;
    state.drag.startY = state.image.y;
    state.drag.startW = state.image.width;
    state.drag.startH = state.image.height;
    state.drag.startMouseX = x;
    state.drag.startMouseY = y;
    canvas.style.cursor = "nwse-resize";
    return;
  }

  if (
    x >= state.image.x &&
    x <= state.image.x + state.image.width &&
    y >= state.image.y &&
    y <= state.image.y + state.image.height
  ) {
    state.drag.active = true;
    state.drag.mode = "move";
    state.drag.offsetX = x - state.image.x;
    state.drag.offsetY = y - state.image.y;
    canvas.style.cursor = "grabbing";
  }
});

window.addEventListener("mousemove", (event) => {
  if (!state.image) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  if (state.drag.active && state.drag.mode === "move") {
    updateImagePosition(x - state.drag.offsetX, y - state.drag.offsetY);
    return;
  }

  if (state.drag.active && state.drag.mode === "resize") {
    const ratio = state.image.naturalW / state.image.naturalH;
    const useRatio = controls.lockRatio.checked;
    const handle = state.drag.handle;
    let anchorX = state.drag.startX;
    let anchorY = state.drag.startY;
    let ux = 0;
    let uy = 0;

    if (handle === "se") {
      anchorX = state.drag.startX;
      anchorY = state.drag.startY;
      ux = x - anchorX;
      uy = y - anchorY;
    } else if (handle === "sw") {
      anchorX = state.drag.startX + state.drag.startW;
      anchorY = state.drag.startY;
      ux = anchorX - x;
      uy = y - anchorY;
    } else if (handle === "ne") {
      anchorX = state.drag.startX;
      anchorY = state.drag.startY + state.drag.startH;
      ux = x - anchorX;
      uy = anchorY - y;
    } else if (handle === "nw") {
      anchorX = state.drag.startX + state.drag.startW;
      anchorY = state.drag.startY + state.drag.startH;
      ux = anchorX - x;
      uy = anchorY - y;
    }

    let newW = Math.max(MIN_IMAGE_SIZE, ux);
    let newH = Math.max(MIN_IMAGE_SIZE, uy);

    if (useRatio) {
      if (newW / newH > ratio) {
        newH = newW / ratio;
      } else {
        newW = newH * ratio;
      }
    }

    let newX = anchorX;
    let newY = anchorY;
    if (handle === "se") {
      newX = anchorX;
      newY = anchorY;
    } else if (handle === "sw") {
      newX = anchorX - newW;
      newY = anchorY;
    } else if (handle === "ne") {
      newX = anchorX;
      newY = anchorY - newH;
    } else if (handle === "nw") {
      newX = anchorX - newW;
      newY = anchorY - newH;
    }

    applyResize({ width: newW, height: newH, x: newX, y: newY });
    return;
  }

  const handle = getHandleAtPoint(x, y);
  if (handle) {
    canvas.style.cursor = "nwse-resize";
    return;
  }

  const hovering =
    x >= state.image.x &&
    x <= state.image.x + state.image.width &&
    y >= state.image.y &&
    y <= state.image.y + state.image.height;
  canvas.style.cursor = hovering ? "grab" : "default";
});

window.addEventListener("mouseup", () => {
  state.drag.active = false;
  state.drag.mode = "move";
  state.drag.handle = null;
});

controls.canvasWrap.addEventListener("dragover", (event) => {
  event.preventDefault();
});

controls.canvasWrap.addEventListener("drop", (event) => {
  event.preventDefault();
  const [file] = event.dataTransfer.files;
  handleFile(file);
});

initPages();
updateImageControlState();
