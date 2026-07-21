import { useState, useRef, useEffect, useCallback } from "react";

// ---- Conversión de color ----
function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

function rgbToHex(r, g, b) {
  const toHex = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map(c => c + c).join("")
    : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const PRESETS = ["#2E75B6", "#16a34a", "#dc2626", "#7c3aed", "#ea580c", "#0891b2", "#111827", "#ffffff"];

export default function ColorPickerModal({ initialColor, onClose, onSelect }) {
  const initialRgb = hexToRgb(initialColor) || { r: 46, g: 117, b: 182 };
  const [hsv, setHsv] = useState(() => rgbToHsv(initialRgb.r, initialRgb.g, initialRgb.b));
  const [hexInput, setHexInput] = useState(rgbToHex(initialRgb.r, initialRgb.g, initialRgb.b));

  const squareRef = useRef(null);
  const hueRef = useRef(null);
  const draggingSquare = useRef(false);
  const draggingHue = useRef(false);

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);

  useEffect(() => { setHexInput(hex); }, [hex]);

  const updateFromSquarePoint = useCallback((clientX, clientY) => {
    const rect = squareRef.current.getBoundingClientRect();
    let x = (clientX - rect.left) / rect.width;
    let y = (clientY - rect.top) / rect.height;
    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    setHsv(prev => ({ ...prev, s: x * 100, v: (1 - y) * 100 }));
  }, []);

  const updateFromHuePoint = useCallback((clientX) => {
    const rect = hueRef.current.getBoundingClientRect();
    let x = (clientX - rect.left) / rect.width;
    x = Math.max(0, Math.min(1, x));
    setHsv(prev => ({ ...prev, h: x * 360 }));
  }, []);

  useEffect(() => {
    function handleMove(e) {
      const point = e.touches ? e.touches[0] : e;
      if (draggingSquare.current) updateFromSquarePoint(point.clientX, point.clientY);
      if (draggingHue.current) updateFromHuePoint(point.clientX);
    }
    function handleUp() {
      draggingSquare.current = false;
      draggingHue.current = false;
    }
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [updateFromSquarePoint, updateFromHuePoint]);

  function handleHexChange(value) {
    setHexInput(value);
    const parsed = hexToRgb(value);
    if (parsed) setHsv(rgbToHsv(parsed.r, parsed.g, parsed.b));
  }

  function handleRgbChange(channel, value) {
    const n = Math.max(0, Math.min(255, Number(value) || 0));
    const next = { ...rgb, [channel]: n };
    setHsv(rgbToHsv(next.r, next.g, next.b));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}>
        <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wide">Seleccionar color</h2>

        {/* Cuadro de saturación/brillo */}
        <div
          ref={squareRef}
          onMouseDown={e => { draggingSquare.current = true; updateFromSquarePoint(e.clientX, e.clientY); }}
          onTouchStart={e => { draggingSquare.current = true; const t = e.touches[0]; updateFromSquarePoint(t.clientX, t.clientY); }}
          className="relative w-full h-44 rounded-xl cursor-pointer select-none touch-none"
          style={{
            backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
            backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
          }}
        >
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: hex }}
          />
        </div>

        {/* Barra de tono */}
        <div
          ref={hueRef}
          onMouseDown={e => { draggingHue.current = true; updateFromHuePoint(e.clientX); }}
          onTouchStart={e => { draggingHue.current = true; updateFromHuePoint(e.touches[0].clientX); }}
          className="relative w-full h-5 rounded-full cursor-pointer select-none touch-none"
          style={{ background: "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)" }}
        >
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md top-1/2 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
          />
        </div>

        {/* Vista previa + HEX */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-600 flex-shrink-0" style={{ backgroundColor: hex }} />
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Código HEX</label>
            <input
              className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={hexInput}
              onChange={e => handleHexChange(e.target.value)}
              maxLength={7}
            />
          </div>
        </div>

        {/* RGB */}
        <div className="grid grid-cols-3 gap-2">
          {["r", "g", "b"].map(channel => (
            <div key={channel}>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {channel === "r" ? "Rojo" : channel === "g" ? "Verde" : "Azul"}
              </label>
              <input
                type="number" min={0} max={255}
                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 rounded-xl px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={rgb[channel]}
                onChange={e => handleRgbChange(channel, e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Presets rápidos */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Colores rápidos</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(c => (
              <button key={c}
                onClick={() => { const p = hexToRgb(c); setHsv(rgbToHsv(p.r, p.g, p.b)); }}
                className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-600"
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={onClose}
            className="border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700">
            Cancelar
          </button>
          <button onClick={() => onSelect(hex)}
            className="text-white font-semibold rounded-xl py-3 text-sm hover:opacity-90"
            style={{ backgroundColor: hex }}>
            Establecer
          </button>
        </div>
      </div>
    </div>
  );
}
