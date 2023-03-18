
import Color from "./color.js";

const DOQ = {
  colorSchemes: [],
  flags: { engineOn: false, isPrinting: false }
}
let activeTone = {};
let styleCache = new Map();

function setCanvasTheme(scheme, tone) {
  const newTone = DOQ.colorSchemes[scheme].tones[tone];
  if (newTone !== activeTone) {
    styleCache.clear();
    activeTone = newTone;
  }
  return activeTone;
}

function initEngine(colorSchemes) {
  const newColor = arg => new Color(arg);
  colorSchemes.forEach(scheme => {
    scheme.colors = (scheme.accents || []).map(newColor);
    scheme.tones.forEach(tone => {
      const [b, f] = [tone.background, tone.foreground].map(newColor);
      tone.colors = {
        bg: b, fg: f, grad: b.range(f),
        acc: (tone.accents || []).map(newColor).concat(scheme.colors)
      };
      tone.scheme = scheme;
    });
  });
  DOQ.colorSchemes = colorSchemes;
  wrapCanvas();
}

/* Wrap canvas drawing */
function wrapCanvas() {
  const checks = style => checkFlags() && checkStyle(style);
  const ctxp = CanvasRenderingContext2D.prototype;
  ctxp.origFillRect = ctxp.fillRect;

  ["fill", "stroke"].forEach(f => {
    ["", "Rect"].forEach(e => {
      ctxp[f + e] = wrapAPI(ctxp[f + e], resetShapeStyle, checks, f + "Style");
    });
    wrapSet(ctxp, f + "Style", getCanvasStyle, checks);
  });
  ctxp.fillText = wrapAPI(ctxp.fillText, updateTextStyle, checks, "fillStyle");

  ctxp.origDrawImage = ctxp.drawImage;
  ctxp.drawImage = wrapAPI(ctxp.drawImage, setCanvasCompOp, checkFlags);
}

/* Method and setter wrapper closures */
function wrapAPI(method, callHandler, test, prop) {
  return function() {
    if (!test?.(this[prop])) {
      return method.apply(this, arguments);
    }
    this.save();
    callHandler(this, method, arguments, prop);
    const retVal = method.apply(this, arguments);
    this.restore();
    return retVal;
  }
}

function wrapSet(obj, prop, getNewVal, test) {
  const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
  const { set: ownSet, get: ownGet } = descriptor;

  Object.defineProperty(obj, prop, {
    get() {
      return ownGet.call(this);
    },
    set(arg) {
      ownSet.call(this, arg);
      if (!test?.(arg)) {
        return;
      }
      const value = ownGet.call(this);
      ownSet.call(this, getNewVal(value));
      obj["orig" + prop] = value;
    }
  });
  obj["set" + prop] = ownSet;
}

function checkFlags() {
  const { flags } = DOQ;
  return flags.engineOn && !flags.isPrinting;
}

function checkStyle(style) {
  return typeof(style) === "string";        /* is not gradient/pattern */
}


function getCanvasStyle(style, bg) {
  style = new Color(style);
  const key = style.hex + (bg?.hex || "");
  let newStyle = styleCache.get(key);

  if (!newStyle) {
    newStyle = bg ? getTextStyle(style, bg) : calcStyle(style);
    styleCache.set(key, newStyle);
  }
  return newStyle.toHex(style.alpha);
}

/* Calculate a new style for given colorscheme and tone */
function calcStyle(color) {
  const { grad, acc } = activeTone.colors;
  let style;

  if (color.chroma > 10 && acc.length) {
    style = findMatch(acc, e => e.deltaE(color), Math.min);
  } else {
    const whiteL = Color.white.lightness;
    style = grad(1 - color.lightness / whiteL);
  }
  return style;
}

function getTextStyle(color, textBg, minContrast = 30) {
  const { bg, fg } = activeTone.colors;
  const diffL = clr => Math.abs(clr.lightness - textBg.lightness);

  if (bg.deltaE(textBg) > 2.3 && diffL(color) < minContrast) {
    return findMatch([color, bg, fg], diffL, Math.max);
  }
  return color;
}

function findMatch(array, mapFun, condFun) {
  const newArr = array.map(mapFun);
  return array[newArr.indexOf(condFun(...newArr))];
}

/* Alter fill and stroke styles */
function resetShapeStyle(ctx, method, args, prop) {
  if (isAccent(ctx[prop])) {
    ctx.hasAccents = true;
  }
  if (DOQ.flags.shapesOn) {
    return;
  }
  const { width, height } = ctx.canvas;

  if (method.name === "fillRect" && args[2] == width && args[3] == height) {
    return;
  }
  const setStyle = ctx["set" + prop];
  setStyle.call(ctx, ctx["orig" + prop]);
}

function updateTextStyle(ctx, method, args, prop) {
  const style = ctx[prop];

  if (!ctx.hasAccents && !isAccent(style)) {
    return;
  }
  const bg = getCanvasColor(ctx, ...args);
  const newStyle = getCanvasStyle(style, bg);

  if (newStyle !== style) {
    const setStyle = ctx["set" + prop];
    setStyle.call(ctx, newStyle);
  }
}

function getCanvasColor(ctx, text, tx, ty) {
  const mtr = ctx.measureText(text);
  const dx = mtr.width / 2;
  const dy = (mtr.actualBoundingBoxAscent - mtr.actualBoundingBoxDescent) / 2;

  const tfm = ctx.getTransform();
  let {x, y} = tfm.transformPoint({ x: tx + dx, y: ty - dy });
  [x, y] = [x, y].map(Math.round);

  const canvasData = ctx.getImageData(x, y, 1, 1);
  const rgb = Array.from(canvasData.data.slice(0, 3));
  return new Color(rgb.map(e => e / 255));
}

function isAccent(style) {
  const { accents, scheme } = activeTone;
  const isStyle = s => s.toLowerCase() === style;
  style = style.toLowerCase();
  return accents?.some(isStyle) || scheme.accents?.some(isStyle);
}

/* Return image composite operation, drawing an optional mask */
function setCanvasCompOp(ctx, drawImage, args) {
  if (!DOQ.flags.imagesOn || !ctx.canvas.isConnected) {
    return;
  }
  const { colors, foreground } = activeTone;

  if (colors.bg.lightness < 50 && args.length >= 5) {
    args = [...args];
    const mask = createMask(foreground, args.slice(0, 5));
    args.splice(0, 1, mask);
    drawImage.apply(ctx, args);
  }
  ctx.globalCompositeOperation = "multiply";
}

function createMask(color, args) {
  const cvs = document.createElement("canvas");
  const dim = [cvs.width, cvs.height] = args.slice(3);
  const ctx = cvs.getContext("2d");

  ctx.setfillStyle(color);
  ctx.origFillRect(0, 0, ...dim);
  ctx.globalCompositeOperation = "destination-in";
  ctx.origDrawImage(...args, 0, 0, ...dim);
  return cvs;
}

export { DOQ, initEngine, setCanvasTheme, getCanvasStyle, checkFlags };
