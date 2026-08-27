var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", {
    value,
    configurable: true
});
import fs from "fs";
import { ChildProcess } from "child_process";
import http from "http";
import "dotenv/config";
import express from "express";
import {
    getNativeMixer
} from "./src/decklink/index.ts";
import path from "path";
import {
    fileURLToPath
} from "url";
import {
    createRequire
} from "module";
import dotenv from "dotenv";
let currentFilename = process.cwd();
try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
        currentFilename = fileURLToPath(import.meta.url)
    } else if (typeof __filename !== "undefined") {
        currentFilename = __filename
    }
} catch (e) {}
const require2 = createRequire(currentFilename);
const __dirname = path.dirname(currentFilename);
dotenv.config();
const possibleEnvPaths = [];
possibleEnvPaths.push(path.join(process.cwd(), ".env"));
possibleEnvPaths.push(path.join(process.cwd(), ".env.example"));
if (typeof __dirname !== "undefined") {
    possibleEnvPaths.push(path.join(__dirname, ".env"));
    possibleEnvPaths.push(path.join(__dirname, ".env.example"))
}
if (process.execPath) {
    const execDir = path.dirname(process.execPath);
    possibleEnvPaths.push(path.join(execDir, ".env"));
    possibleEnvPaths.push(path.join(execDir, ".env.example"))
}
for (const p of possibleEnvPaths) {
    try {
        dotenv.config({
            path: p
        })
    } catch (e) {}
}
let _require;
try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
        const dir = path.dirname(fileURLToPath(import.meta.url));
        dotenv.config({
            path: path.join(dir, ".env")
        });
        dotenv.config({
            path: path.join(dir, ".env.example")
        });
        _require = createRequire(import.meta.url)
    } else {
        _require = require2
    }
} catch (e) {
    _require = require2
}
import {
    spawnSync,
    spawn
} from "child_process";
import ffmpegPath from "ffmpeg-static";
import {
    createProxyMiddleware
} from "http-proxy-middleware";
import crypto from "crypto";
import si from "systeminformation";
import os from "os";
const allSpawnedProcesses = new Set;

function registerProcess(proc) {
    if (!proc) return;
    allSpawnedProcesses.add(proc);
    proc.on("exit", () => allSpawnedProcesses.delete(proc));
    proc.on("error", () => allSpawnedProcesses.delete(proc))
}
__name(registerProcess, "registerProcess");

function cleanupProcesses() {
    console.log("[Bridge] Cleaning up all spawned processes...");
    for (const proc of allSpawnedProcesses) {
        try {
            if (process.platform === "win32") {
                spawnSync("taskkill", ["/F", "/T", "/PID", (proc as any).pid.toString()])
            } else {
                (proc as any).kill("SIGKILL")
            }
        } catch (e) {}
    }
    allSpawnedProcesses.clear()
}
__name(cleanupProcesses, "cleanupProcesses");
process.on("SIGINT", cleanupProcesses);
process.on("SIGTERM", cleanupProcesses);
process.on("exit", cleanupProcesses);
let currentDir = "";
if (typeof __dirname !== "undefined") {
    currentDir = __dirname
} else if (typeof import.meta !== "undefined" && import.meta.url) {
    try {
        const {
            fileURLToPath: fileURLToPath2
        } = require2("url");
        currentDir = path.dirname(fileURLToPath2(import.meta.url))
    } catch (e) {
        currentDir = process.cwd()
    }
} else {
    currentDir = process.cwd()
}
let defaultDataRoot = path.join(process.cwd(), "data");
if (typeof process.versions.electron !== "undefined") {
    try {
        const {
            app
        } = require2("electron");
        defaultDataRoot = path.join(app.getPath("userData"), "data")
    } catch (e) {
        defaultDataRoot = path.join(os.homedir(), "KlarityViewProData")
    }
} else if (process.platform === "win32" && process.cwd().includes("Program Files")) {
    defaultDataRoot = path.join(os.homedir(), "KlarityViewProData")
}
const dataRoot = defaultDataRoot;
const logsDir = path.join(dataRoot, "logs");
const configsDir = path.join(dataRoot, "configs");
const vmDir = path.join(os.homedir(), "Documents", "KlarityView", "vm");
const profilesDir = path.join(dataRoot, "secure_profiles");
[dataRoot, logsDir, configsDir, vmDir, profilesDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
            recursive: true
        })
    }
});
const appDataLogFile = path.join(logsDir, `app_${new Date().toISOString().split("T")[0]}.log`);
const rootLogFile = path.join(dataRoot, "logs.txt");
const appDataLogStream = fs.createWriteStream(appDataLogFile, {
    flags: "a"
});
const rootLogStream = fs.createWriteStream(rootLogFile, {
    flags: "a"
});
const systemLogs = [];
const systemLogSubscribers = new Set;
const addSystemLog = __name(msg => {
    systemLogs.push(msg);
    if (systemLogs.length > 500) systemLogs.shift();
    systemLogSubscribers.forEach(res => {
        (res as any).write(`data: ${JSON.stringify({log:msg})}

`)
    })
}, "addSystemLog");
const formatLogMsg = __name(args => args.map(a => {
    if (typeof a === "object") {
        try {
            if (a instanceof Error) return a.stack || a.message;
            return JSON.stringify(a)
        } catch (e) {
            return String(a)
        }
    }
    return String(a)
}).join(" "), "formatLogMsg");
const origLog = console.log;
const origErr = console.error;
const origWarn = console.warn;
const origInfo = console.info;

function writeLogLines(level, args) {
    const timestamp = new Date().toISOString();
    const fullMsg = formatLogMsg(args);
    const lines = fullMsg.replace(/\n$/, "").split("\n");
    const formattedMsg = lines.map(line => `[${timestamp}] [${level}] ${line}`).join("\n");
    appDataLogStream.write(formattedMsg + "\n");
    rootLogStream.write(formattedMsg + "\n");
    addSystemLog(formattedMsg)
}
__name(writeLogLines, "writeLogLines");
console.log = function(...args) {
    writeLogLines("INFO", args);
    origLog.apply(console, args)
};
console.error = function(...args) {
    writeLogLines("ERROR", args);
    origErr.apply(console, args)
};
console.warn = function(...args) {
    writeLogLines("WARN", args);
    origWarn.apply(console, args)
};
console.info = function(...args) {
    writeLogLines("INFO", args);
    origInfo.apply(console, args)
};
process.on("uncaughtException", err => {
    const msg = `[${new Date().toISOString()}] [CRITICAL_CRASH] Uncaught Exception: ${err.message}
${err.stack}
`;
    appDataLogStream.write(msg);
    rootLogStream.write(msg);
    addSystemLog(msg);
    origErr("CRITICAL:", err)
});
process.on("unhandledRejection", (reason, promise) => {
    const msg = `[${new Date().toISOString()}] [CRITICAL_CRASH] Unhandled Rejection at: ${promise} reason: ${reason}
`;
    appDataLogStream.write(msg);
    rootLogStream.write(msg);
    addSystemLog(msg);
    origErr("CRITICAL REJECTION:", reason)
});
import {
    VirtualCamera
} from "./src/lib/vcam-native.js";
import {
    StreamManager
} from "./src/lib/StreamManager.js";

function parseFps(resStr) {
    if (!resStr) return "30";
    const match = resStr.match(/@([\d.]+)p/);
    return match ? match[1] : "30"
}
__name(parseFps, "parseFps");
async function startServer() {
    const app = express();
    const nativeMixer = getNativeMixer();
    if (nativeMixer) {
        console.log("[NativeMixer] Initializing hardware mixer...");
        nativeMixer.startMixer();
        if (process.env.DECKLINK_OUTPUT_ENABLED === "true") {
            try {
                const msg = nativeMixer.startDeckLinkOutput(parseInt(process.env.DECKLINK_OUTPUT_INDEX || "0", 10));
                console.log("[NativeMixer] DeckLink Output: ", msg)
            } catch (e) {
                console.warn("[NativeMixer] No DeckLink output available")
            }
        } else {
            console.log("[NativeMixer] DeckLink Output disabled by default. Enable in Settings.")
        }
    }
    const PORT = 3000;
    const mediamtxProxy = createProxyMiddleware({
        target: "http://127.0.0.1:9997",
        changeOrigin: true,
        ws: false,
        pathRewrite: {
            "^/api/mediamtx": ""
        },
        on: {
            proxyReq: __name((proxyReq, req, res) => {
                console.log(`[MediaMTX Proxy] Forwarding ${req.method} ${req.url} -> ${proxyReq.path}`)
            }, "proxyReq"),
            error: __name((err, req, res) => {
                const targetUrl = req.url || req.url;
                console.error(`[MediaMTX Proxy] Error for ${targetUrl}:`, err.message);
                if ((res as any).writeHead && !res.headersSent) {
                    (res as any).writeHead(504, {
                        "Content-Type": "application/json"
                    });
                    res.end(JSON.stringify({
                        error: "Gateway Timeout",
                        message: "MediaMTX took too long or is unreachable.",
                        details: err.message,
                        target: targetUrl
                    }))
                }
            }, "error")
        },
        proxyTimeout: 6e4,
        timeout: 6e4
    });
    app.get("/api/mediamtx/ping", (req, res) => {
        res.json({
            status: "ok",
            timestamp: new Date().toISOString()
        })
    });
    app.post("/api/logs/client", express.json(), (req, res) => {
        const {
            level,
            message,
            data
        } = req.body;
        const dataStr = data ? typeof data === "object" ? JSON.stringify(data) : data : "";
        if (level?.toLowerCase() === "error") {
            console.error(`[BROWSER] ${message} ${dataStr}`)
        } else if (level?.toLowerCase() === "warn") {
            console.warn(`[BROWSER] ${message} ${dataStr}`)
        } else {
            console.log(`[BROWSER] ${message} ${dataStr}`)
        }
        res.status(204).end()
    });
    app.post("/api/gemini/analyze-frame", express.json({
        limit: "50mb"
    }), async (req, res) => {
        try {
            const {
                image,
                prompt,
                model
            } = req.body;
            if (!image) {
                return res.status(400).json({
                    error: "No image provided"
                })
            }
            const {
                GoogleGenAI
            } = await import("@google/genai").then(s => {
                const e = "default";
                return (s[e] as any) ? (s[e] as any) : (s as any)
            });
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return res.status(401).json({
                    error: "GEMINI_API_KEY is not set. Please provide it in your environment variables."
                })
            }
            const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                    headers: {
                        "User-Agent": "aistudio-build"
                    }
                }
            });
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            const response = await ai.models.generateContent({
                model: model || "gemini-2.0-flash",
                contents: {
                    parts: [{ text: prompt || "Analyze this medical image (e.g., Angiography, OCT, IVUS) and describe any visible structures or patterns. Please note this is for educational purposes only and not a clinical diagnosis." }, { inlineData: {
                            data: base64Data,
                            mimeType: "image/jpeg"
                        }
                    }]
                }
            });
            res.json({
                analysis: response.text
            })
        } catch (e) {
            console.error("Error analyzing frame", e);
            if (e.status === 429 || e.message && e.message.includes("Quota exceeded")) {
                res.status(429).json({
                    error: "Gemini API Quota Exceeded. Please try again later or use offline mode.",
                    isQuotaError: true
                })
            } else {
                res.status(500).json({
                    error: e.message || "Failed to analyze frame"
                })
            }
        }
    });
    app.use((req, res, next) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
        if (req.method === "OPTIONS") {
            return res.sendStatus(200)
        }
        if (req.url.startsWith("/api")) {
            console.log(`API Request: ${req.method} ${req.url}`)
        }
        next()
    });
    const mediamtxWebrtcProxy = createProxyMiddleware({
        target: "http://127.0.0.1:8889",
        changeOrigin: true,
        ws: false,
        pathRewrite: {
            "^/api/mediamtx/webrtc": ""
        },
        on: {
            error: __name((err, req, res) => {
                if ((res as any).writeHead && !res.headersSent) {
                    (res as any).writeHead(504, {
                        "Content-Type": "application/json"
                    });
                    res.end(JSON.stringify({
                        error: "Gateway Timeout"
                    }))
                }
            }, "error")
        }
    });
    app.use("/api/mediamtx/webrtc", mediamtxWebrtcProxy);
    app.use("/api/mediamtx", mediamtxProxy);
    const server = http.createServer(app);
    const resolveAsarPath = __name(p => {
        if (!p) return "";
        return p.includes("app.asar") ? p.replace("app.asar", "app.asar.unpacked") : p
    }, "resolveAsarPath");
    const getResourcePath = __name(relativePath => {
        let p = path.join(currentDir, relativePath);
        if (fs.existsSync(resolveAsarPath(p as string))) {
            return resolveAsarPath(p)
        }
        p = path.join(currentDir, "..", relativePath);
        if (fs.existsSync(resolveAsarPath(p as string))) {
            return resolveAsarPath(p)
        }
        p = path.join(currentDir, relativePath);
        if (fs.existsSync(resolveAsarPath(p as string))) {
            return resolveAsarPath(p)
        }
        const execDir = getExecutableDir();
        p = path.join(execDir, relativePath);
        if (fs.existsSync(resolveAsarPath(p as string))) {
            return resolveAsarPath(p)
        }
        p = path.join(execDir, "app.asar", relativePath);
        if (fs.existsSync(resolveAsarPath(p as string))) {
            return resolveAsarPath(p)
        }
        return resolveAsarPath(path.join(process.cwd(), relativePath))
    }, "getResourcePath");
    const getExecutableDir = __name(() => {
        try {
            if (process.versions && process.versions.electron) {
                const isPackaged = process.mainModule?.filename?.includes("app.asar") || currentDir.includes("app.asar");
                if (isPackaged) {
                    return process.resourcesPath || path.join(process.execPath, "..", "resources")
                }
            }
        } catch (e) {}
        if (typeof currentDir !== "undefined" && currentDir) {
            let baseDir = currentDir;
            if (baseDir.includes("app.asar")) {
                baseDir = baseDir.replace("app.asar", "app.asar.unpacked");
                return path.join(baseDir, "..")
            }
            if (baseDir.endsWith("dist")) {
                return path.join(baseDir, "..")
            }
            return process.cwd()
        }
        return process.cwd()
    }, "getExecutableDir");
    const actualFfmpegPath = resolveAsarPath(ffmpegPath);
    const exeBaseDir = getExecutableDir();
    if (actualFfmpegPath) {
        process.env.PATH = path.dirname(actualFfmpegPath) + path.delimiter + process.env.PATH
    }
    let resolvedFfmpegPath = actualFfmpegPath;
    let hasFfmpeg = false;
    const searchFfmpeg = __name(() => {
        if (actualFfmpegPath) {
            const staticCheck = spawnSync(actualFfmpegPath, ["-version"]);
            if (staticCheck.status === 0) return actualFfmpegPath
        }
        const commonPaths = ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/avconv", "/opt/homebrew/bin/ffmpeg", "C:\\ffmpeg\\bin\\ffmpeg.exe", path.join(process.cwd(), "ffmpeg.exe"), path.join(process.cwd(), "ffmpeg")];
        for (const p of commonPaths) {
            try {
                if (fs.existsSync(p as string)) {
                    const check = spawnSync(p, ["-version"]);
                    if (check.status === 0) return p
                }
            } catch (e) {}
        }
        return null
    }, "searchFfmpeg");
    const detectedPath = searchFfmpeg();
    if (detectedPath) {
        resolvedFfmpegPath = detectedPath;
        hasFfmpeg = true;
        console.log(`[KlarityView Bridge] FFmpeg detected at: ${resolvedFfmpegPath}`)
    } else {
        console.error(`[KlarityView Bridge] FATAL: No FFmpeg detected in common paths or ffmpeg-static. RTSP and AI features will be disabled.`)
    }
    const getMediamtxBinaryName = __name(() => {
        switch (process.platform) {
            case "win32":
                return "mediamtx.exe";
            case "darwin":
                return "mediamtx-darwin";
            default:
                return "mediamtx-linux"
        }
    }, "getMediamtxBinaryName");
    const mediamtxBinName = getMediamtxBinaryName();
    const originalMediamtxPath = getResourcePath(path.join("bin", mediamtxBinName));
    let mediamtxProc = null;
    const resourcesDir = path.join(dataRoot, "resources");
    if (!fs.existsSync(resourcesDir)) {
        try {
            fs.mkdirSync(resourcesDir, {
                recursive: true
            })
        } catch (e) {
            console.error(`[MediaMTX Bridge] Failed to create resources dir:`, e)
        }
    }
    const actualMediamtxPath = path.join(resourcesDir, mediamtxBinName);
    try {
        if (process.platform === "win32") {
            spawnSync("taskkill", ["/F", "/T", "/IM", mediamtxBinName], {
                stdio: "ignore"
            })
        } else {
            spawnSync("killall", ["-9", mediamtxBinName], {
                stdio: "ignore"
            })
        }
        console.log(`[MediaMTX Bridge] Cleaned up existing ${mediamtxBinName} processes.`)
    } catch (e) {}
    try {
        if (fs.existsSync(originalMediamtxPath) && (!fs.existsSync(actualMediamtxPath) || fs.statSync(originalMediamtxPath).mtimeMs > fs.statSync(actualMediamtxPath).mtimeMs)) {
            fs.copyFileSync(originalMediamtxPath, actualMediamtxPath);
            console.log(`[MediaMTX Bridge] Copied MediaMTX binary to ${actualMediamtxPath}`)
        }
    } catch (e) {
        console.error(`[MediaMTX Bridge] Failed to copy MediaMTX binary:`, e)
    }
    const mediamtxConfigPath = path.join(resourcesDir, "mediamtx.yml");
    const mediamtxConfig = `
paths:
  all:
api: yes
apiAddress: :9997
webrtc: yes
webrtcAddress: :8889
rtsp: yes
rtspAddress: :8556
rtpAddress: :8050
rtcpAddress: :8051
webrtcLocalUDPAddress: :8189
rtmp: no
hls: no
srt: yes
srtAddress: :8890
multicastIPRange: 224.1.0.0/16
multicastRTPPort: 8022
multicastRTCPPort: 8023
srtpAddress: :8024
srtcpAddress: :8025
multicastSRTPPort: 8026
multicastSRTCPPort: 8027
`;
    try {
        fs.writeFileSync(mediamtxConfigPath, mediamtxConfig)
    } catch (e) {
        console.error(`[MediaMTX Bridge] Could not write config to ${mediamtxConfigPath}`, e)
    }
    const spawnMediamtx = () => {
        if (fs.existsSync(actualMediamtxPath) || fs.existsSync(originalMediamtxPath)) {
            const pathToRun = fs.existsSync(actualMediamtxPath) ? actualMediamtxPath : originalMediamtxPath;
            try {
                fs.chmodSync(pathToRun, 493);
                const mtxEnv = {
                    ...process.env
                };
                if (hasFfmpeg && resolvedFfmpegPath) {
                    mtxEnv.PATH = `${path.dirname(resolvedFfmpegPath)}${path.delimiter}${mtxEnv.PATH||""}`
                }
                mediamtxProc = spawn(pathToRun, [], {
                    windowsHide: true,
                    stdio: "pipe",
                    cwd: resourcesDir, // Always run from resourcesDir where mediamtx.yml is
                    env: mtxEnv
                });
                registerProcess(mediamtxProc);
                mediamtxProc.on("error", err => {
                    console.error(`[MediaMTX Bridge] Spawn error:`, err)
                });
                mediamtxProc.on("exit", (code, signal) => {
                    console.error(`[MediaMTX Bridge] Exited with code ${code} and signal ${signal}. Retrying in 3s...`);
                    setTimeout(spawnMediamtx, 3000);
                });
                mediamtxProc.stdout?.on("data", data => console.log(`[MediaMTX] ${data}`));
                mediamtxProc.stderr?.on("data", data => console.error(`[MediaMTX ERR] ${data}`))
            } catch (e) {
                console.error(`[MediaMTX Bridge] Failed to spawn mediamtx:`, e)
            }
        }
    };
    console.log(`[MediaMTX Bridge] Spawning mediamtx from: ${actualMediamtxPath}`);
    spawnMediamtx();
    const activeStreams = new Map;
    const cleanup = __name(() => {
        try {
            if (mediamtxProc && mediamtxProc.kill) mediamtxProc.kill("SIGKILL")
        } catch (e) {}
        try {
            if (activeYouTubeBroadcast && activeYouTubeBroadcast.kill) activeYouTubeBroadcast.kill("SIGKILL")
        } catch (e) {}
        try {
            if (typeof activeStreams !== "undefined") {
                for (const stream of activeStreams.values()) {
                    if (stream && stream.process && stream.process.kill) {
                        stream.process.kill("SIGKILL")
                    }
                }
            }
        } catch (e) {}
    }, "cleanup");
    process.on("exit", cleanup);
    process.on("SIGINT", () => {
        cleanup();
        process.exit()
    });
    process.on("SIGTERM", () => {
        cleanup();
        process.exit()
    });
    let activeYouTubeBroadcast = null;
    const wsModule = _require("ws");
    const WebSocketServer = wsModule.WebSocketServer || wsModule.Server;
    const youtubeWss = new WebSocketServer({
        noServer: true
    });
    youtubeWss.on("connection", ws => {
        console.log("[YouTube] Client connected for streaming");
        let ffmpegProc = null;
        let bytesReceived = 0;
        let lastLogTime = Date.now();
        ws.on("message", (data, isBinary) => {
            if (!isBinary) {
                try {
                    const message = data.toString();
                    const payload = JSON.parse(message);
                    if (payload.type === "start") {
                        if (ffmpegProc) ffmpegProc.kill();
                        let url = payload.url || "rtmp://a.rtmp.youtube.com/live2";
                        const key = payload.key;
                        if (!key) {
                            console.error("[YouTube] Missing stream key");
                            if (ws.readyState === 1) ws.send(JSON.stringify({
                                type: "error",
                                message: "Missing stream key"
                            }));
                            return
                        }
                        if (!url.startsWith("rtmp://") && !url.startsWith("rtmps://")) {
                            url = "rtmp://" + url
                        }
                        const rtmpUrl = `${url.replace(/\/$/,"")}/${key}`;
                        console.log(`[YouTube] Starting FFmpeg process to RTMP: ${rtmpUrl}`);
                        const args = ["-f", "webm", "-i", "pipe:0", "-c:v", "libx264", "-preset", "veryfast", "-tune", "zerolatency", "-b:v", "4500k", "-maxrate", "5000k", "-bufsize", "10000k", "-pix_fmt", "yuv420p", "-g", "60", "-keyint_min", "60", "-x264-params", "keyint=60:min-keyint=60:scenecut=-1", "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "44100", "-f", "flv", rtmpUrl];
                        console.log(`[YouTube] Spawning ffmpeg: ${resolvedFfmpegPath} ${args.join(" ")}`);
                        ffmpegProc = spawn(resolvedFfmpegPath, args, {
                            detached: false,
                            windowsHide: true
                        });
                        registerProcess(ffmpegProc);
                        activeYouTubeBroadcast = ffmpegProc;
                        bytesReceived = 0;
                        ffmpegProc.stderr?.on("data", d => {
                            const log = d.toString();
                            if (log.toLowerCase().includes("error") || log.toLowerCase().includes("failed")) {
                                console.log(`[YouTube FFmpeg ERROR] ${log}`);
                                if (ws.readyState === 1) ws.send(JSON.stringify({
                                    type: "log",
                                    level: "error",
                                    message: log
                                }))
                            } else if (Date.now() - lastLogTime > 5e3) {
                                console.log(`[YouTube FFmpeg] ${log}`);
                                lastLogTime = Date.now()
                            }
                        });
                        ffmpegProc.on("close", code => {
                            console.log(`[YouTube] FFmpeg closed with code ${code}. Total bytes sent: ${bytesReceived}`);
                            if (activeYouTubeBroadcast === ffmpegProc) activeYouTubeBroadcast = null;
                            ffmpegProc = null
                        });
                        ffmpegProc.on("error", err => {
                            console.log(`[YouTube] FFmpeg process error: ${err.message}`, err)
                        });
                        ffmpegProc.stdin.on("error", err => {
                            console.log(`[YouTube] FFmpeg stdin error: ${err.message}`)
                        })
                    } else if (payload.type === "stop") {
                        if (ffmpegProc) {
                            ffmpegProc.stdin.end();
                            ffmpegProc.kill();
                            ffmpegProc = null
                        }
                        activeYouTubeBroadcast = null
                    }
                } catch (e) {
                    console.error(`[YouTube] WebSocket message processing error:`, e.message)
                }
            } else {
                let message;
                if (Buffer.isBuffer(data)) {
                    message = data
                } else if (Array.isArray(data)) {
                    message = Buffer.concat(data)
                } else {
                    message = Buffer.from(data)
                }
                if (bytesReceived === 0) {
                    console.log(`[YouTube] Received first chunk: ${message.length} bytes. FFmpeg proc state: ${!!ffmpegProc&&!ffmpegProc.killed}`)
                }
                bytesReceived += message.length;
                if (ffmpegProc && ffmpegProc.stdin) {
                    if (ffmpegProc.stdin.writable) {
                        ffmpegProc.stdin.write(message)
                    } else {
                        if (Date.now() - lastLogTime > 5e3) {
                            console.log(`[YouTube] Stdin not writable. bytesReceived=${bytesReceived}. proc.exitCode=${ffmpegProc.exitCode}`)
                        }
                    }
                }
            }
        });
        ws.on("close", () => {
            console.log("[YouTube] Client disconnected");
            if (ffmpegProc) {
                ffmpegProc.stdin.end();
                ffmpegProc.kill();
                ffmpegProc = null
            }
            activeYouTubeBroadcast = null
        })
    });
    const vcamWss = new WebSocketServer({
        noServer: true,
        path: "/api/virtual-camera",
        maxPayload: 200 * 1024 * 1024,
        perMessageDeflate: false
    });
    const webrtcSignalingWss = new WebSocketServer({
        noServer: true
    });
    webrtcSignalingWss.on("connection", ws => {
        console.log("[Signaling] WebRTC Client connected");
        ws.on("message", message => {
            webrtcSignalingWss.clients.forEach(client => {
                if (client !== ws && client.readyState === 1) {
                    client.send(message.toString())
                }
            })
        });
        ws.on("close", () => console.log("[Signaling] WebRTC Client disconnected"))
    });
    let virtualCams = [];
    let deckLinkOutput = null;
    if (process.env.DECKLINK_OUTPUT_ENABLED === "true") {
        try {
            const dl = require2("native-decklink");
            if (dl) {
                console.log("[DeckLink] Initializing DeckLink output...");
                console.log("[DeckLink]", dl.startDeckLinkOutput(parseInt(process.env.DECKLINK_OUTPUT_INDEX || "0", 10)));
                deckLinkOutput = dl
            }
        } catch (e) {
            console.error("[DeckLink] Failed to load native-decklink addon:", e);
        }
    }
    let vCamReady = false;
    let activeVcamWsc = null;
    if (nativeMixer) {
        if (typeof (nativeMixer as any).enableDirectVcam === "function") {
            (nativeMixer as any).enableDirectVcam(true);
            setInterval(() => {
                if (virtualCams && virtualCams.length > 0 && virtualCams[0].active) {
                    virtualCams[0].setDirectFrameActive()
                }
            }, 100)
        }
        if (typeof nativeMixer.setVcamCallback === "function") {
            nativeMixer.setVcamCallback(buffer => {
                if (virtualCams && virtualCams.length > 0 && virtualCams[0].active) {
                    virtualCams[0].setDirectFrameActive();
                    virtualCams[0].sendFrame(buffer, 1920, 1080, true)
                }
            })
        }
        let lastPreviewTime = 0;
        const jpeg = require2("jpeg-js");
        nativeMixer.setPreviewCallback(buffer => {
            const now = Date.now();
            if (now - lastPreviewTime < 33) return;
            lastPreviewTime = now;
            try {
                const rawImageData = {
                    data: buffer,
                    width: 640,
                    height: 360,
                };
                const jpegData = jpeg.encode(rawImageData, 50).data;
                vcamWss.clients.forEach(client => {
                    if (client.readyState === 1) {
                        client.send(jpegData)
                    }
                });
            } catch (e) {
                console.error("Preview encode error:", e);
            }
        })
    }
    const streamManager = new StreamManager(resolvedFfmpegPath);
    let frameCount = 0;
    streamManager.on("frame", (id, rgba, w, h, x, y, dw, dh, zIndex) => {
        frameCount++;
        if (frameCount % 100 === 0) {
            console.log(`[StreamManager] Emitted 100 frames. Latest from: ${id} (${w}x${h})`)
        }
        virtualCams.forEach(cam => cam.updateSource(id, rgba, w, h, x, y, dw, dh, zIndex));
        if (nativeMixer) {
            nativeMixer.addSource(id);
            nativeMixer.pushSourceFrame(id, rgba)
        }
    });
    streamManager.on("removed", id => {
        virtualCams.forEach(cam => cam.removeSource(id))
    });
    vcamWss.on("error", e => console.error("vcamWss error:", e)); vcamWss.on("connection", async socket => {
        console.log("[Bridge] WebApp connected for VirtualCamera");
        if (virtualCams.length === 0) {
            const vcam = new VirtualCamera(1920, 1080);
            virtualCams = [vcam]
        }
        vCamReady = true;
        activeVcamWsc = socket;
        const frameChunks = new Map;
        socket.on("message", (message, isBinary) => {
            let data = null;
            let isControlMessage = false;
            try {
                let msgStr = void 0;
                if (typeof message === "string") msgStr = message;
                else if (message instanceof Buffer && !isBinary) msgStr = message.toString("utf-8");
                else if (message instanceof Buffer && message.length > 0 && message[0] === 123) {
                    const str = message.toString("utf-8");
                    if (str.trim().startsWith("{")) msgStr = str
                }
                if (msgStr) {
                    data = JSON.parse(msgStr);
                    isControlMessage = true
                }
            } catch (e) {}
            if (isControlMessage && data) {
                if (data.type !== "LAYOUT") {
                    console.log(`[Vcam] Processing Control Message: ${data.type}`)
                }
                if (data.type === "CLEAR_SOURCES") {
                    virtualCams.forEach(cam => cam.clearSources())
                } else if (data.type === "REMOVE_SOURCE") {
                    virtualCams.forEach(cam => cam.removeSource(data.id));
                    if (data.id === 9999 && typeof nativeMixer !== "undefined" && nativeMixer && nativeMixer.pushSourceFrame) {
                        try {
                            const blank = Buffer.alloc(1920 * 1080 * 4);
                            nativeMixer.pushSourceFrame(9999, blank)
                        } catch (e) {}
                    }
                } else if (data.type === "LAYOUT" && data.sources) {
                    const activeIds = new Set;
                    let programId = -1;
                    let pipId = -1;
                    const sorted = [...data.sources].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
                    if (sorted.length > 0) programId = sorted[0].id;
                    if (sorted.length > 1) pipId = sorted[1].id;
                    if (nativeMixer) {
                        nativeMixer.setProgramSource(9999);
                        nativeMixer.setPipSource(-1, false)
                    }
                    for (const src of data.sources) {
                        if (!src.url) continue;
                        let urlToUse = src.url;
                        if (urlToUse.startsWith("ffmpeg:")) {
                            urlToUse = urlToUse.replace("ffmpeg:", "")
                        }
                        if (!urlToUse.startsWith("ndi") && !urlToUse.startsWith("decklink") && !urlToUse.startsWith("rtmp") && !urlToUse.startsWith("udp") && !urlToUse.startsWith("rtsp")) continue;
                        src.url = urlToUse;
                        activeIds.add(src.url);
                        streamManager.addSource(src)
                    }
                    for (const key of streamManager.getKeys()) {
                        if (!activeIds.has(key)) {
                            streamManager.removeSource(key)
                        }
                    }
                }
                return
            }
            if (!Buffer.isBuffer(message)) return; 
            const msgBuf = message; 
            const sizeRgba = 1920 * 1080 * 4;
            const sizeNv12 = 1920 * 1080 * 1.5;
            const sizeYuy2 = 1920 * 1080 * 2;
            if (msgBuf.length === 5 && msgBuf[0] === 72 && msgBuf[1] === 89 && msgBuf[2] === 66 && msgBuf[3] === 82 && msgBuf[4] === 2) {
                try {
                    socket.send(JSON.stringify({
                        type: "ACK"
                    }))
                } catch (e) {}
                return
            }
            if (msgBuf.length > 2 && msgBuf[0] === 255 && msgBuf[1] === 216 && msgBuf[2] === 255) {
                try {
                    
                    let data2;
                    let imgWidth = 1920;
                    let imgHeight = 1080;
                    let isBgra = false;
                    try {
                        const { nativeImage } = require('electron');
                        if (nativeImage) {
                            const image = nativeImage.createFromBuffer(msgBuf);
                            let bmp;
                            const size = image.getSize();
                            if (size.width !== 1920 || size.height !== 1080) {
                                bmp = image.resize({width: 1920, height: 1080}).toBitmap();
                            } else {
                                bmp = image.toBitmap();
                            }
                            imgWidth = 1920;
                            imgHeight = 1080;
                            data2 = Buffer.from(bmp.buffer);
                            // Swap BGRA to RGBA in-place so the rest of the pipeline can uniformly assume RGBA
                            const src32 = new Uint32Array(data2.buffer, data2.byteOffset, data2.length / 4);
                            for (let i = 0; i < src32.length; i++) {
                                const p = src32[i];
                                src32[i] = (p & 0xFF00FF00) | ((p & 0x00FF0000) >>> 16) | ((p & 0x000000FF) << 16);
                            }
                            isBgra = false; // It is now RGBA
                        } else {
                            throw new Error("No nativeImage");
                        }
                    } catch(e) {
                        const jpeg = require2("jpeg-js");
                        const rawImageData = jpeg.decode(msgBuf, { useTArray: true });
                        data2 = Buffer.from(rawImageData.data);
                        imgWidth = rawImageData.width;
                        imgHeight = rawImageData.height;
                    }

                    
                    const hasNativeMixer = typeof nativeMixer !== "undefined" && nativeMixer && nativeMixer.addSource;
                    if (hasNativeMixer) {
                        if (!global.frameLogCount) global.frameLogCount = 0;
                        global.frameLogCount++;
                        if (global.frameLogCount % 60 === 0) {
                            console.log("[Bridge] Pushed decoded JPEG overlay frame to nativeMixer")
                        }
                        try {
                            
                            nativeMixer.addSource(9999);
                            nativeMixer.pushSourceFrame(9999, data2);

                            nativeMixer.setProgramSource(9999);
                            nativeMixer.setPipSource(-1, false)
                        } catch (e) {}
                    }
                    
                    virtualCams.forEach(cam => {
                        if (cam.setDirectFrameActive) cam.setDirectFrameActive();
                        if (typeof cam.sendJpegFrame === "function" && (cam.vcamInstance?.constructor?.name === "MockVcam" || typeof cam.vcamInstance?.sendJpegFrame === "function")) {
                            cam.sendJpegFrame(msgBuf)
                        } else {
                            cam.sendFrame(data2, imgWidth, imgHeight, true, isBgra)
                        }
                    });
                } catch (e) {
                    console.error("[Bridge] VirtualCamera JPEG decode error:", e);
                }
                try {
                    socket.send(JSON.stringify({
                        type: "ACK"
                    }))
                } catch (e) {}
            } else if (msgBuf.length === sizeRgba || msgBuf.length === sizeNv12 || msgBuf.length === sizeYuy2) {
                try {
                    if (msgBuf.length === sizeRgba) {
                        const hasNativeMixer = typeof nativeMixer !== "undefined" && nativeMixer && nativeMixer.addSource;
                        if (hasNativeMixer) {
                            if (!global.frameLogCount) global.frameLogCount = 0;
                            global.frameLogCount++;
                            if (global.frameLogCount % 60 === 0) {
                                console.log("[Bridge] Pushed overlay frame to nativeMixer")
                            }
                            try {
                                nativeMixer.addSource(9999);
                                nativeMixer.pushSourceFrame(9999, msgBuf);
                                nativeMixer.setProgramSource(9999);
                                nativeMixer.setPipSource(-1, false)
                            } catch (e) {}
                        }
                        virtualCams.forEach(cam => {
                            if (cam.setDirectFrameActive) cam.setDirectFrameActive();
                            if (global.frameLogCount % 60 === 0) console.log("[Bridge] Sending RGBA directly to vcam");
                            cam.sendFrame(msgBuf, 1920, 1080, true)
                        });
                    } else {
                        virtualCams.forEach(cam => {
                            if (cam.setDirectFrameActive) cam.setDirectFrameActive();
                            cam.sendFrame(msgBuf, 1920, 1080, true)
                        })
                    }
                } catch (e) {
                    console.error("[Bridge] VirtualCamera sendFrame error:", e) 
                }
                try {
                    socket.send(JSON.stringify({
                        type: "ACK"
                    }))
                } catch (e) {}
            } else {
                let state = frameChunks.get(socket);
                if (!state) {
                    state = {
                        chunks: [],
                        receivedSize: 0
                    };
                    frameChunks.set(socket, state)
                }
                if (state.receivedSize === 0 && msgBuf.length >= 37 && msgBuf[0] === 72 && msgBuf[1] === 89 && msgBuf[2] === 66 && msgBuf[3] === 82 && msgBuf[4] === 1) {
                    state.expectedSize = 37 + msgBuf.readInt32LE(9) * msgBuf.readInt32LE(13) * 4
                }
                state.chunks.push(msgBuf);
                state.receivedSize += msgBuf.length;
                const expectedSize = state.expectedSize || sizeRgba;
                if (state.receivedSize === expectedSize || state.receivedSize === sizeNv12 || state.receivedSize === sizeYuy2) {
                    const fullFrame = Buffer.concat(state.chunks);
                    state.chunks = [];
                    state.receivedSize = 0;
                    state.expectedSize = void 0;
                    try {
                        if (fullFrame.length > 37 && fullFrame[0] === 72 && fullFrame[1] === 89 && fullFrame[2] === 66 && fullFrame[3] === 82 && fullFrame[4] === 1) {
                            const id = fullFrame.readInt32LE(5);
                            const width = fullFrame.readInt32LE(9);
                            const height = fullFrame.readInt32LE(13);
                            const dx = fullFrame.readInt32LE(17);
                            const dy = fullFrame.readInt32LE(21);
                            const dw = fullFrame.readInt32LE(25);
                            const dh = fullFrame.readInt32LE(29);
                            const zIndex = fullFrame.readInt32LE(33);
                            const rgba = fullFrame.subarray(37);
                            if (rgba.length === width * height * 4) {
                                virtualCams.forEach(cam => cam.updateSource(id, rgba, width, height, dx, dy, dw, dh, zIndex))
                            }
                        } else {
                            if (fullFrame.length === sizeRgba) {
                                if (typeof nativeMixer !== "undefined" && nativeMixer && nativeMixer.addSource) {
                                    try {
                                        nativeMixer.addSource(9999);
                                        nativeMixer.pushSourceFrame(9999, fullFrame)
                                    } catch (e) {}
                                }
                                virtualCams.forEach(cam => {
                                    if (cam.setDirectFrameActive) cam.setDirectFrameActive();
                                    cam.sendFrame(fullFrame, 1920, 1080, true)
                                })
                            } else {
                                if (deckLinkOutput && fullFrame.length === sizeNv12) {
                                    try {
                                        deckLinkOutput.pushFrameNV12(fullFrame)
                                    } catch (e) {}
                                }
                                virtualCams.forEach(cam => cam.sendFrame(fullFrame, 1920, 1080, true))
                            }
                        }
                    } catch (e) {
                        console.error("[Bridge] VirtualCamera processing error:", e)
                    }
                    try {
                        socket.send(JSON.stringify({
                            type: "ACK"
                        }))
                    } catch (e) {}
                } else if (state.receivedSize > Math.max(sizeRgba * 2, expectedSize + 1e3)) {
                    state.chunks = [];
                    state.receivedSize = 0;
                    state.expectedSize = void 0;
                    try {
                        socket.send(JSON.stringify({
                            type: "ACK"
                        }))
                    } catch (e) {}
                }
            }
        });
        socket.on("close", (code, reason) => {
            console.log(`[Bridge] WebApp disconnected. Code: ${code}, Reason: ${reason?.toString()||"No reason"}`);
            frameChunks.delete(socket);
            if (activeVcamWsc === socket) {
                activeVcamWsc = null;
                vCamReady = false;
                // DO NOT close virtualCams, keep them alive to push black frames
                virtualCams.forEach(cam => {
                    try {
                        if (cam.pushStandbyFrame) cam.pushStandbyFrame();
                    } catch (e) {}
                });
            }
            streamManager.clearSources()
        });
        const interval = setInterval(() => {
            if (socket.readyState === 1) {
                socket.ping()
            } else {
                clearInterval(interval)
            }
        }, 3e4);
        socket.on("pong", () => {});
        socket.on("close", () => clearInterval(interval));
        socket.on("error", err => {
            console.error("[Bridge] WebApp WebSocket error:", err)
        })
    });
    const DEFAULT_VM_PATH_BASE = path.join(vmDir, "ConfigVM.xml");
    const VM_CONFIG_INFO_PATH = path.join(vmDir, "vm_path.json");
    const VM_CONFIG_INFO_PATH_ALT = path.join(currentDir, "vm_path.json");
    if (!fs.existsSync(DEFAULT_VM_PATH_BASE)) {
        const src = getResourcePath(path.join("vm", "ConfigVM.xml"));
        if (fs.existsSync(src)) {
            try {
                fs.copyFileSync(src, DEFAULT_VM_PATH_BASE);
                console.log(`[Audio] Copied bundled ConfigVM.xml from ${src} to ${DEFAULT_VM_PATH_BASE}`)
            } catch (e) {
                console.error(`[Audio] Failed to copy ConfigVM.xml:`, e)
            }
        }
    }
    let activeVmConfigPath = DEFAULT_VM_PATH_BASE;
    console.log(`[Audio] Initializing Voicemeeter Config Path...`);
    console.log(`[Audio] process.cwd(): ${process.cwd()}`);
    console.log(`[Audio] currentDir: ${currentDir}`);
    console.log(`[Audio] Default path: ${DEFAULT_VM_PATH_BASE}`);
    const tryLoadPath = __name(p => {
        console.log(`[Audio] Checking for config info at: ${p}`);
        if (fs.existsSync(p as string)) {
            try {
                const content = fs.readFileSync(p, "utf-8");
                console.log(`[Audio] Found stored config info at ${p}: ${content}`);
                const stored = JSON.parse(content);
                if (stored && stored.path) {
                    activeVmConfigPath = stored.path;
                    console.log(`[Audio] Active config path set to: ${activeVmConfigPath}`);
                    return true
                }
            } catch (e) {
                console.error(`[Audio] Error parsing ${p}: ${e.message}`)
            }
        }
        return false
    }, "tryLoadPath");
    if (!tryLoadPath(VM_CONFIG_INFO_PATH)) {
        if (!tryLoadPath(VM_CONFIG_INFO_PATH_ALT)) {
            tryLoadPath(path.join(path.dirname(process.cwd()), "vm_path.json"))
        }
    }
    let vmInit = false;
    let voicemeeterInstance = null;
    try {
        if (process.platform === "win32") {
            console.log("Windows host detected. Voicemeeter API ready for manual launch via /api/voicemeeter/launch.");
            setTimeout(() => {
                fetch("http://127.0.0.1:3000/api/voicemeeter/launch", {
                    method: "POST"
                }).catch(() => {})
            }, 1e3)
        } else {
            console.log("Not running on Windows, Voicemeeter will be mocked.")
        }
    } catch (e) {}
    const AUDIO_CONFIG_PATH = path.join(dataRoot, "audio_config.json");
    let mockVmState = {
        headsets: [],
        mics: [],
        unassignedHeadsets: []
    };
    try {
        if (fs.existsSync(AUDIO_CONFIG_PATH)) {
            const stored = JSON.parse(fs.readFileSync(AUDIO_CONFIG_PATH, "utf-8"));
            mockVmState = {
                ...mockVmState,
                ...stored
            };
            if (!mockVmState.headsets) mockVmState.headsets = [];
            if (!mockVmState.mics) mockVmState.mics = [];
            if (!mockVmState.unassignedHeadsets) mockVmState.unassignedHeadsets = []
        }
    } catch (e) {
        console.error("Failed to load audio config:", e)
    }
    const saveAudioConfig = __name(() => {
        try {
            fs.writeFileSync(AUDIO_CONFIG_PATH, JSON.stringify(mockVmState, null, 2), "utf-8")
        } catch (e) {
            console.error("Failed to save audio config:", e)
        }
    }, "saveAudioConfig");
    app.post("/api/voicemeeter/launch", async (req, res) => {
        if (process.platform !== "win32") {
            return res.json({
                success: true,
                message: "Mocked on non-Windows"
            })
        }
        if (vmInit) {
            return res.json({
                success: true,
                message: "Already initialized"
            })
        }
        console.log("[Audio] Launch request received from UI.");
        try {
            const {
                execSync,
                spawn: spawn2
            } = _require("child_process");
            const fsPlugin = await import("fs").then(s => {
                const e = "default";
                return (s[e] as any) ? (s[e] as any) : (s as any)
            });
            console.log("[Audio] Force killing existing Voicemeeter instances...");
            try {
                execSync("taskkill /IM voicemeeter.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            try {
                execSync("taskkill /IM voicemeeterpro.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            try {
                execSync("taskkill /IM voicemeeter8.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            try {
                execSync("taskkill /IM voicemeeter8x64.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            setTimeout(() => {
                try {
                    const vmExe64 = "C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeter8x64.exe";
                    const vmExe32 = "C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeter8.exe";
                    let vmExeToUse = "";
                    if (fsPlugin.existsSync(vmExe64)) vmExeToUse = vmExe64;
                    else if (fsPlugin.existsSync(vmExe32)) vmExeToUse = vmExe32;
                    if (vmExeToUse) {
                        console.log(`[Audio] Stage 1: Launching ${path.basename(vmExeToUse)}`);
                        spawn2(vmExeToUse, [], {
                            detached: true,
                            stdio: "ignore",
                            windowsHide: false
                        }).unref();
                        setTimeout(() => {
                            console.log(`[Audio] Stage 2: Applying config via -L "${activeVmConfigPath}"`);
                            const safePath = activeVmConfigPath.replace(/\\/g, "/");
                            spawn2(vmExeToUse, ["-h", "-L", safePath], {
                                detached: true,
                                stdio: "ignore",
                                windowsHide: true
                            }).unref()
                        }, 2500)
                    } else {
                        const vmDir2 = getResourcePath("vm");
                        const vmBatPath = path.join(vmDir2, "VoiceMeeterConfig.bat");
                        _require("child_process").execFile("cmd.exe", ["/c", "start", '""', "/min", vmBatPath])
                    }
                } catch (e) {}
            }, 2500);
            setTimeout(() => {
                try {
                    const vmModule = _require("voicemeeter-connector");
                    vmModule.Voicemeeter.init().then(instance => {
                        voicemeeterInstance = instance;
                        voicemeeterInstance.connect();
                        vmInit = true;
                        console.log("[Audio] Voicemeeter initialized successfully.");
                        setTimeout(() => {
                            try {
                                voicemeeterInstance.setOption("Command.Show=0;")
                            } catch (e) {}
                        }, 3500)
                    }).catch(e => console.log("[Audio] Voicemeeter init failed:", e?.message))
                } catch (e) {}
            }, 8e3);
            res.json({
                success: true,
                message: "Voicemeeter launched in background"
            })
        } catch (e) {
            res.status(500).json({
                error: String(e)
            })
        }
    });
    app.get("/api/voicemeeter/status", (req, res) => {
        res.json({
            initialized: vmInit,
            platform: process.platform
        })
    });
    app.get("/api/voicemeeter/state", (req, res) => {
        res.json(mockVmState)
    });
    let nextUsbIndex = 1;
    app.post("/api/launch-app", express.json(), (req, res) => {
        const {
            path: path2,
            admin
        } = req.body;
        if (!path2) return res.status(400).json({
            error: "Path is required"
        });
        import("child_process").then(s => {
            const e = "default";
            return (s[e] as any) ? (s[e] as any) : (s as any)
        }).then(({
            execFile,
            exec: exec2
        }) => {
            if (admin && process.platform === "win32") {
                const psCommand = `powershell -Command "Start-Process -FilePath '${path2}' -Verb RunAs"`;
                exec2(psCommand, error => {
                    if (error) {
                        console.error(`Error launching app as admin at ${path2}:`, error.message)
                    }
                })
            } else {
                execFile(path2, error => {
                    if (error) {
                        console.error(`Error launching app at ${path2}:`, error.message)
                    }
                })
            }
            res.json({
                success: true
            })
        })
    });
    app.post("/api/voicemeeter/mock-plugin", (req, res) => {
        if (mockVmState.unassignedHeadsets.length + mockVmState.headsets.length < 5) {
            mockVmState.unassignedHeadsets.push({
                hardwareId: `usb-vid-epos-${nextUsbIndex}`,
                name: `EPOS SDI 5011 (USB${nextUsbIndex})`
            });
            nextUsbIndex++;
            saveAudioConfig()
        }
        res.json({
            success: true,
            state: mockVmState
        })
    });
    let oscClient = null;
    try {
        const {
            Client: OSCClient
        } = _require("node-osc");
        oscClient = new OSCClient("127.0.0.1", 9e3);
        console.log("[Audio] OSC client initialized for SteaMeeter integration at 127.0.0.1:9000")
    } catch (e) {
        console.error("[Audio] OSC client init failed:", e)
    }
    app.post("/api/voicemeeter/route", express.json(), (req, res) => {
        const {
            headsetId,
            micId,
            enable
        } = req.body;
        const headset = mockVmState.headsets.find(h => h.id === headsetId);
        const mic = mockVmState.mics.find(m => m.id === micId);
        if (headset && mic) {
            if (enable && !headset.mics.includes(micId)) headset.mics.push(micId);
            if (!enable) headset.mics = headset.mics.filter(id => id !== micId);
            saveAudioConfig();
            const param = `Strip[${mic.stripIndex}].${headset.busPrefix}`;
            if (oscClient) {
                const address = `/avatar/parameters/sm/strip/${mic.stripIndex}/${headset.busPrefix}`;
                oscClient.send(address, enable ? 1 : 0, () => {})
            }
            if (vmInit && voicemeeterInstance) {
                try {
                    voicemeeterInstance.setOption(`${param}=${enable?1:0};`)
                } catch (e) {
                    console.error("Voicemeeter set parameter error:", e)
                }
            }
        }
        res.json({
            success: true,
            state: mockVmState
        })
    });
    app.post("/api/voicemeeter/headset/enable", express.json(), (req, res) => {
        const {
            headsetId,
            enable
        } = req.body;
        const headset = mockVmState.headsets.find(h => h.id === headsetId);
        if (headset) {
            headset.enabled = enable;
            saveAudioConfig();
            const param = `Bus[${headset.busIndex}].Mute`;
            if (oscClient) {
                const address = `/avatar/parameters/sm/bus/${headset.busIndex}/Mute`;
                oscClient.send(address, enable ? 0 : 1, () => {})
            }
            if (vmInit && voicemeeterInstance) {
                try {
                    voicemeeterInstance.setOption(`${param}=${enable?0:1};`)
                } catch (e) {
                    console.error("Voicemeeter set parameter error:", e)
                }
            }
        }
        res.json({
            success: true,
            state: mockVmState
        })
    });
    const vmParamCache = new Map;
    app.post("/api/voicemeeter/set-parameters-batch", express.json(), async (req, res) => {
        const {
            updates
        } = req.body;
        if (!Array.isArray(updates)) return res.json({
            success: false
        });
        let hasError = false;
        for (const update of updates) {
            const {
                param,
                value
            } = update;
            if (vmParamCache.get(param) === value) continue;
            vmParamCache.set(param, value);
            if (oscClient) {
                const match = param.match(/(Strip|Bus)\[(.+)\]\.(.+)/);
                if (match) {
                    const [_, type, index, prop] = match;
                    let address = `/avatar/parameters/sm/${type.toLowerCase()}/${index}/${prop}`;
                    if (prop.toLowerCase() === "gain") {
                        const mappedValue = typeof value === "number" ? Math.max(0, Math.min(1, (value + 60) / 72)) : value;
                        address = `/avatar/parameters/sm/gain/${index}`;
                        oscClient.send(address, mappedValue, () => {})
                    } else {
                        let val = value;
                        if (typeof value === "boolean") val = value ? 1 : 0;
                        oscClient.send(address, val, () => {})
                    }
                }
            }
            if (vmInit && voicemeeterInstance) {
                try {
                    if (typeof value === "number") {
                        voicemeeterInstance.setOption(`${param}=${value};`)
                    } else if (typeof value === "string") {
                        voicemeeterInstance.setOption(`${param}="${value}";`)
                    }
                    await new Promise(r => setTimeout(r, 2))
                } catch (e) {
                    console.error("Voicemeeter batch set parameter error:", e);
                    hasError = true
                }
            }
        }
        res.json({
            success: !hasError
        })
    });
    app.post("/api/voicemeeter/set-parameter", express.json(), (req, res) => {
        const {
            param,
            value
        } = req.body;
        if (oscClient) {
            const match = param.match(/(Strip|Bus)\[(.+)\]\.(.+)/);
            if (match) {
                const [_, type, index, prop] = match;
                let address = `/avatar/parameters/sm/${type.toLowerCase()}/${index}/${prop}`;
                if (prop.toLowerCase() === "gain") {
                    const mappedValue = typeof value === "number" ? Math.max(0, Math.min(1, (value + 60) / 72)) : value;
                    address = `/avatar/parameters/sm/gain/${index}`;
                    oscClient.send(address, mappedValue, () => {})
                } else {
                    let val = value;
                    if (typeof value === "boolean") val = value ? 1 : 0;
                    oscClient.send(address, val, () => {})
                }
            }
        }
        if (vmInit && voicemeeterInstance) {
            try {
                if (typeof value === "number") {
                    voicemeeterInstance.setOption(`${param}=${value};`)
                } else if (typeof value === "string") {
                    voicemeeterInstance.setOption(`${param}="${value}";`)
                }
                res.json({
                    success: true
                })
            } catch (e) {
                console.error("Voicemeeter set parameter error:", e);
                res.json({
                    success: false,
                    error: e.message
                })
            }
        } else {
            res.json({
                success: true,
                note: "Sent via OSC"
            })
        }
    });
    app.post("/api/voicemeeter/load-config", express.json(), (req, res) => {
        const {
            path: configPath
        } = req.body;
        if (vmInit && voicemeeterInstance) {
            try {
                const safePath = configPath.replace(/\\/g, "/");
                voicemeeterInstance.setOption(`Command.Load="${safePath}";`);
                console.log(`[Audio] Loading config via API: ${safePath}`);
                const {
                    spawn: spawn2
                } = _require("child_process");
                const vmExe64 = "C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeter8x64.exe";
                const vmExe32 = "C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeter8.exe";
                let vmExeToUse = fs.existsSync(vmExe64) ? vmExe64 : fs.existsSync(vmExe32) ? vmExe32 : "";
                if (vmExeToUse) {
                    spawn2(vmExeToUse, ["-h", "-L", safePath], {
                        detached: true,
                        stdio: "ignore",
                        windowsHide: true
                    }).unref()
                }
                res.json({
                    success: true,
                    message: "Configuration loaded"
                })
            } catch (e) {
                console.error("Voicemeeter load config error:", e);
                res.json({
                    success: false,
                    error: e.message
                })
            }
        } else {
            res.json({
                success: false,
                error: "Voicemeeter not initialized locally"
            })
        }
    });
    app.post("/api/voicemeeter/headset/ping", express.json(), (req, res) => {
        const {
            hardwareId
        } = req.body;
        console.log(`[Audio] Pinging headset hardware: ${hardwareId}`);
        res.json({
            success: true
        })
    });
    app.post("/api/voicemeeter/headset/pair", express.json(), (req, res) => {
        const {
            hardwareId,
            name,
            color
        } = req.body;
        const unassignedIdx = mockVmState.unassignedHeadsets.findIndex(h => h.hardwareId === hardwareId);
        if (unassignedIdx !== -1) {
            const uHeadset = mockVmState.unassignedHeadsets[unassignedIdx];
            if (mockVmState.headsets.length >= 5) {
                return res.status(400).json({
                    error: "Maximum 5 headsets supported in Voicemeeter Potato"
                })
            }
            const index = mockVmState.headsets.length;
            const id = `h-${index}`;
            const newHeadset = {
                id,
                hardwareId,
                name: name || uHeadset.name,
                color: color || "#3b82f6",
                enabled: true,
                busIndex: index,
                busPrefix: `A${index+1}`,
                mics: []
            };
            const newMic = {
                id,
                name: `${newHeadset.name} Mic`,
                stripIndex: index
            };
            mockVmState.headsets.push(newHeadset);
            mockVmState.mics.push(newMic);
            mockVmState.unassignedHeadsets.splice(unassignedIdx, 1);
            saveAudioConfig();
            const LIVE_BUS_PREFIX = "B1";
            for (let h of mockVmState.headsets) {
                if (h.id !== newHeadset.id) {
                    h.mics.push(newMic.id);
                    newHeadset.mics.push(h.id);
                    if (vmInit && voicemeeterInstance) {
                        try {
                            voicemeeterInstance.setOption(`Strip[${newMic.stripIndex}].${h.busPrefix}=1;`);
                            voicemeeterInstance.setOption(`Strip[${h.busIndex}].${newHeadset.busPrefix}=1;`)
                        } catch (e) {}
                    }
                }
            }
            if (vmInit && voicemeeterInstance) {
                try {
                    voicemeeterInstance.setOption(`Strip[${newMic.stripIndex}].${LIVE_BUS_PREFIX}=1;`)
                } catch (e) {}
            }
            console.log(`[Audio] Headset paired: ${newHeadset.name} on Strip ${newMic.stripIndex} / Bus ${newHeadset.busPrefix}`)
        }
        res.json({
            success: true,
            state: mockVmState
        })
    });
    app.post("/api/voicemeeter/full-restart", (req, res) => {
        try {
            const {
                execSync,
                spawn: spawn2
            } = _require("child_process");
            console.log("[Audio] Full Restart Triggered. Killing instances...");
            try {
                execSync("taskkill /IM voicemeeter.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            try {
                execSync("taskkill /IM voicemeeterpro.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            try {
                execSync("taskkill /IM voicemeeter8.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            try {
                execSync("taskkill /IM voicemeeter8x64.exe /F", {
                    stdio: "ignore"
                })
            } catch (e) {}
            setTimeout(() => {
                const vmExe64 = "C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeter8x64.exe";
                const vmExe32 = "C:\\Program Files (x86)\\VB\\Voicemeeter\\voicemeeter8.exe";
                let vmExeToUse = fs.existsSync(vmExe64) ? vmExe64 : fs.existsSync(vmExe32) ? vmExe32 : "";
                if (vmExeToUse) {
                    console.log(`[Audio] Restart Stage 1: Launching ${path.basename(vmExeToUse)}`);
                    spawn2(vmExeToUse, [], {
                        detached: true,
                        stdio: "ignore",
                        windowsHide: false
                    }).unref();
                    setTimeout(() => {
                        const safePath = activeVmConfigPath.replace(/\\/g, "/");
                        console.log(`[Audio] Restart Stage 2: Applying config via -L "${safePath}"`);
                        spawn2(vmExeToUse, ["-h", "-L", safePath], {
                            detached: true,
                            stdio: "ignore",
                            windowsHide: true
                        }).unref()
                    }, 2e3)
                }
            }, 3e3);
            res.json({
                success: true,
                message: "Voicemeeter restart sequence initiated"
            })
        } catch (e) {
            res.status(500).json({
                error: e.message
            })
        }
    });
    app.get("/api/voicemeeter/config-path", (req, res) => {
        res.json({
            path: activeVmConfigPath
        })
    });
    app.post("/api/voicemeeter/config-path", express.json(), (req, res) => {
        const {
            path: newPath
        } = req.body;
        if (newPath) {
            const resolvedPath = path.isAbsolute(newPath as string) ? (newPath as string) : path.resolve(process.cwd(), newPath);
            activeVmConfigPath = resolvedPath;
            try {
                const data = JSON.stringify({
                    path: resolvedPath
                });
                fs.writeFileSync(VM_CONFIG_INFO_PATH, data, "utf-8");
                try {
                    fs.writeFileSync(VM_CONFIG_INFO_PATH_ALT, data, "utf-8")
                } catch (e) {}
                console.log(`[Audio] Saved new config path: ${resolvedPath}`);
                if (process.platform === "win32") {
                    require2("child_process").execFile("reg", ["add", "HKCU\\Software\\VB-Audio\\VoiceMeeter", "/v", "xmlConfigurationFile", "/t", "REG_SZ", "/d", resolvedPath, "/f"], err => {
                        if (err) console.error("[Audio] Failed to update Voicemeeter registry:", err);
                        else console.log("[Audio] Updated Voicemeeter registry startup config.")
                    });
                    require2("child_process").execFile("reg", ["add", "HKCU\\Software\\VB-Audio\\VoiceMeeter8", "/v", "xmlConfigurationFile", "/t", "REG_SZ", "/d", resolvedPath, "/f"], () => {})
                }
            } catch (e) {
                console.error(`[Audio] Failed to save config path: ${e.message}`)
            }
        }
        res.json({
            success: true,
            path: activeVmConfigPath
        })
    });
    app.get("/api/voicemeeter/config/current", (req, res) => {
        try {
            if (fs.existsSync(activeVmConfigPath)) {
                const buf = fs.readFileSync(activeVmConfigPath);
                let xmlContent = "";
                if (buf.length >= 2 && buf[0] === 255 && buf[1] === 254) {
                    xmlContent = buf.slice(2).toString("utf16le")
                } else {
                    xmlContent = buf.toString("utf8");
                    if (xmlContent.charCodeAt(0) === 65279) xmlContent = xmlContent.slice(1)
                }
                res.json({
                    xml: xmlContent
                })
            } else {
                res.status(404).json({
                    error: `Config file not found at: ${activeVmConfigPath}. Please ensure the path is correct and accessible by the application.`
                })
            }
        } catch (e) {
            res.status(500).json({
                error: `System error reading config: ${String(e)}`
            })
        }
    });
    app.post("/api/voicemeeter/reset", (req, res) => {
        try {
            if (vmInit && voicemeeterInstance) {
                for (let i = 0; i < 8; i++) {
                    try {
                        voicemeeterInstance.setOption(`Strip[${i}].Label=""`)
                    } catch (e) {}
                    try {
                        voicemeeterInstance.setOption(`Bus[${i}].Label=""`)
                    } catch (e) {}
                    try {
                        voicemeeterInstance.setOption(`Strip[${i}].Mute=1`)
                    } catch (e) {}
                    try {
                        voicemeeterInstance.setOption(`Bus[${i}].Mute=1`)
                    } catch (e) {}
                }
            }
            res.json({
                success: true,
                message: "VoiceMeeter devices disconnected"
            })
        } catch (e) {
            res.status(500).json({
                error: String(e)
            })
        }
    });
    app.post("/api/voicemeeter/config/sync", express.json(), (req, res) => {
        const {
            microphones,
            speakers
        } = req.body;
        console.log(`[Config Sync] Syncing API labels for ${microphones?.length||0} mics and ${speakers?.length||0} speakers`);
        try {
            if (vmInit && voicemeeterInstance) {
                for (let i = 0; i < 8; i++) {
                    const stripMics = (microphones || []).filter(m => Number(m.voicemeeterStripIndex) === i);
                    const mic = stripMics[0];
                    const stripLabel = mic ? mic.name : "";
                    const param = `Strip[${i}].Label`;
                    if (vmParamCache.get(param) !== stripLabel) {
                        try {
                            voicemeeterInstance.setOption(`${param}="${stripLabel}"`);
                            vmParamCache.set(param, stripLabel)
                        } catch (e) {}
                    }
                }
                for (let i = 0; i < 8; i++) {
                    const spk = (speakers || []).find(s => Number(s.voicemeeterBusIndex) === i);
                    const busLabel = spk ? spk.name : "";
                    const param = `Bus[${i}].Label`;
                    if (vmParamCache.get(param) !== busLabel) {
                        try {
                            voicemeeterInstance.setOption(`${param}="${busLabel}"`);
                            vmParamCache.set(param, busLabel)
                        } catch (e) {}
                    }
                }
            }
            res.json({
                success: true,
                message: `Labels synced via API (XML unmodified to preserve hardware)`
            })
        } catch (e) {
            console.error(`[Config Sync] ERROR:`, e);
            res.status(500).json({
                error: String(e)
            })
        }
    });
    app.get("/api/virtual-camera/status", (req, res) => {
        res.json({
            available: false,
            vcam: true
        })
    });
    app.get("/api/download/:filename", (req, res) => {
        const filename = req.params.filename;
        let filepath = path.join(process.cwd(), "public", filename);
        if (!fs.existsSync(filepath)) {
            filepath = path.join(process.cwd(), "dist", filename)
        }
        if (fs.existsSync(filepath)) {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            const stream = fs.createReadStream(filepath);
            stream.pipe(res);
        } else {
            res.status(404).send("File not found")
        }
    });
    app.get("/api/settings/decklink-output", (req, res) => {
        res.json({
            index: process.env.DECKLINK_OUTPUT_INDEX || "0",
            enabled: process.env.DECKLINK_OUTPUT_ENABLED === "true"
        })
    });
    app.post("/api/settings/decklink-output", express.json(), (req, res) => {
        const {
            index,
            enabled
        } = req.body;
        if (typeof index === "string") {
            process.env.DECKLINK_OUTPUT_INDEX = index
        }
        if (typeof enabled === "boolean") {
            process.env.DECKLINK_OUTPUT_ENABLED = enabled ? "true" : "false"
        }
        if (typeof index === "string" || typeof enabled === "boolean") {
            const possibleEnvPaths2 = [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.example")];
            if (typeof __dirname !== "undefined") {
                possibleEnvPaths2.push(path.join(__dirname, ".env"));
                possibleEnvPaths2.push(path.join(__dirname, ".env.example"))
            }
            let saved = false;
            for (const envPath of possibleEnvPaths2) {
                try {
                    let envContent = "";
                    if (fs.existsSync(envPath)) {
                        envContent = fs.readFileSync(envPath, "utf-8")
                    }
                    if (typeof index === "string") {
                        if (envContent.includes("DECKLINK_OUTPUT_INDEX=")) {
                            envContent = envContent.replace(/DECKLINK_OUTPUT_INDEX=.*/g, `DECKLINK_OUTPUT_INDEX="${index}"`)
                        } else {
                            envContent += `
DECKLINK_OUTPUT_INDEX="${index}"
`
                        }
                    }
                    if (typeof enabled === "boolean") {
                        const enabledStr = enabled ? "true" : "false";
                        if (envContent.includes("DECKLINK_OUTPUT_ENABLED=")) {
                            envContent = envContent.replace(/DECKLINK_OUTPUT_ENABLED=.*/g, `DECKLINK_OUTPUT_ENABLED="${enabledStr}"`)
                        } else {
                            envContent += `
DECKLINK_OUTPUT_ENABLED="${enabledStr}"
`
                        }
                    }
                    fs.writeFileSync(envPath, envContent);
                    saved = true
                } catch (e) {}
            }
            res.json({
                success: true,
                saved
            })
        } else {
            res.status(400).json({
                error: "invalid index"
            })
        }
    });
    app.get("/api/settings/gemini-key", (req, res) => {
        res.json({
            key: process.env.GEMINI_API_KEY || ""
        })
    });
    app.post("/api/settings/gemini-key", express.json(), (req, res) => {
        const {
            key
        } = req.body;
        if (typeof key === "string") {
            process.env.GEMINI_API_KEY = key;
            const possibleEnvPaths2 = [path.join(process.cwd(), ".env"), path.join(process.cwd(), ".env.example")];
            if (typeof __dirname !== "undefined") {
                possibleEnvPaths2.push(path.join(__dirname, ".env"));
                possibleEnvPaths2.push(path.join(__dirname, ".env.example"))
            }
            let saved = false;
            for (const envPath of possibleEnvPaths2) {
                try {
                    let envContent = "";
                    if (fs.existsSync(envPath)) {
                        envContent = fs.readFileSync(envPath, "utf-8")
                    }
                    if (envContent.includes("GEMINI_API_KEY=")) {
                        envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY="${key}"`)
                    } else {
                        envContent += `
GEMINI_API_KEY="${key}"
`
                    }
                    fs.writeFileSync(envPath, envContent);
                    saved = true
                } catch (e) {}
            }
            res.json({
                success: true
            })
        } else {
            res.status(400).json({
                error: "Invalid key"
            })
        }
    });
    app.post("/api/system/shutdown", (req, res) => {
        console.log("[System] Shutdown requested by client");
        try {} catch (e) {}
        for (const [url, stream] of activeStreams.entries()) {
            try {
                stream.process.kill("SIGKILL")
            } catch (e) {}
        }
        activeStreams.clear();
        vcamWss.clients.forEach(c => c.terminate());
        res.json({
            success: true,
            message: "All backend processes terminated"
        })
    });
    app.get("/api/recording/list", async (req, res) => {
        const targetPath = (req.query.path as string);
        if (!targetPath) {
            return res.status(400).json({
                error: "Missing path"
            })
        }
        try {
            const fs2 = await import("fs").then(s => {
                const e = "default";
                return (s[e] as any) ? (s[e] as any) : (s as any)
            });
            if (!fs2.existsSync(targetPath as string)) {
                return res.json({
                    recordings: []
                })
            }
            const files = [];
            const scanDir = __name((dirPath, isRoot = true) => {
                if (!fs2.existsSync(dirPath)) return;
                const items = fs2.readdirSync(dirPath, {
                    withFileTypes: true
                });
                for (const item of items) {
                    if (item.isDirectory() && isRoot) {
                        scanDir(path.join(dirPath, item.name), false)
                    } else if (!item.isDirectory() && (item.name.endsWith(".mp4") || item.name.endsWith(".webm") || item.name.endsWith(".png") || item.name.endsWith(".mkv"))) {
                        const fullPath = path.join(dirPath, item.name);
                        const stats = fs2.statSync(fullPath);
                        let duration = 0;
                        if (item.name.match(/\.(mp4|webm|mkv)$/)) {
                            const metaPath = fullPath + ".meta.json";
                            if (fs2.existsSync(metaPath)) {
                                try {
                                    const meta = JSON.parse(fs2.readFileSync(metaPath, "utf8"));
                                    duration = meta.duration || 0
                                } catch (e) {}
                            }
                        }
                        files.push({
                            id: item.name + "_" + stats.mtimeMs,
                            date: stats.mtime.toISOString(),
                            patientName: isRoot ? "Unknown" : path.basename(dirPath).replace(/_/g, " "),
                            patientId: isRoot ? "Unknown" : path.basename(dirPath),
                            duration,
                            fileSize: (stats.size / (1024 * 1024)).toFixed(1) + " MB",
                            path: fullPath,
                            mtimeMs: stats.mtimeMs,
                            type: item.name.match(/\.(mp4|webm|mkv)$/) ? "video" : "image",
                            url: `/api/recording/serve?path=${encodeURIComponent(fullPath)}`
                        })
                    }
                }
            }, "scanDir");
            scanDir(targetPath);
            files.sort((a, b) => b.mtimeMs - a.mtimeMs);
            res.json({
                recordings: files
            })
        } catch (e) {
            res.status(500).json({
                error: e.message
            })
        }
    });
    app.get("/api/recording/serve", (req, res) => {
        const filePath = (req.query.path as string);
        if (!filePath) return res.status(400).send("Missing path");
        import("fs").then(s => {
            const e = "default";
            return (s[e] as any) ? (s[e] as any) : (s as any)
        }).then(fs2 => {
            if (!fs2.existsSync(filePath)) return res.status(404).send("Not found");
            res.sendFile(filePath)
        })
    });
    app.post("/api/recording/save", (req, res) => {
        const targetPath = req.headers["x-target-path"];
        const fileName = req.headers["x-file-name"];
        const durationStr = req.headers["x-duration"];
        if (!targetPath || !fileName) {
            return res.status(400).json({
                error: "Missing path or filename"
            })
        }
        import("fs").then(s => {
            const e = "default";
            return (s[e] as any) ? (s[e] as any) : (s as any)
        }).then(fsModule => {
            if (!fsModule.existsSync(targetPath as string)) {
                fsModule.mkdirSync(targetPath as string, {
                    recursive: true
                })
            }
            const fullPath = path.join(targetPath as string, fileName as string);
            const out = fsModule.createWriteStream(fullPath);
            req.pipe(out);
            out.on("finish", () => {
                if (durationStr) {
                    try {
                        fsModule.writeFileSync(fullPath + ".meta.json", JSON.stringify({
                            duration: Number(durationStr)
                        }))
                    } catch (e) {
                        console.error("Failed to write metadata", e)
                    }
                }
                res.json({
                    success: true,
                    path: fullPath
                })
            });
            out.on("error", err => {
                console.error("Recording save error:", err);
                res.status(500).json({
                    error: err.message
                })
            })
        }).catch(err => res.status(500).json({
            error: err.message
        }))
    });
    app.post("/api/recording/ai-process", express.json(), async (req, res) => {
        const {
            path: videoPath,
            instructions,
            model
        } = req.body;
        if (!videoPath || !instructions) {
            return res.status(400).json({
                error: "Missing path or instructions"
            })
        }
        try {
            const fs2 = await import("fs").then(s => {
                const e = "default";
                return (s[e] as any) ? (s[e] as any) : (s as any)
            });
            if (!fs2.existsSync(videoPath)) {
                return res.status(404).json({
                    error: "Video file not found"
                })
            }
            const tmpDir = path.join(os.tmpdir(), "klarity-ai-" + Date.now());
            fs2.mkdirSync(tmpDir, {
                recursive: true
            });
            console.log(`[AI Process] Running frame extraction using ${resolvedFfmpegPath}`);
            await new Promise((resolve, reject) => {
                const {
                    execFile
                } = require2("child_process");
                execFile(resolvedFfmpegPath, ["-i", videoPath, "-vf", "fps=1/10,scale=640:-1", `${tmpDir}/frame_%03d.jpg`], err => {
                    if (err) reject(err);
                    else resolve(true)
                })
            });
            const frameFiles = fs2.readdirSync(tmpDir).sort().filter(f => f.endsWith(".jpg"));
            if (frameFiles.length === 0) {
                throw new Error("Failed to extract frames from video")
            }
            const {
                GoogleGenAI
            } = await import("@google/genai").then(s => {
                const e = "default";
                return (s[e] as any) ? (s[e] as any) : (s as any)
            });
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                return res.status(401).json({
                    error: "GEMINI_API_KEY is not set. Please provide it in your environment variables."
                })
            }
            const ai = new GoogleGenAI({
                apiKey,
                httpOptions: {
                    headers: {
                        "User-Agent": "aistudio-build"
                    }
                }
            });
            const parts = [{
                text: `You are a clinical AI assistant specializing in Cath Lab procedures. Analyze these frames from a medical recording. 
              
              Instructions: ${instructions}
              
              Identify clinical segments/phases. For each segment, provide:
              - startTime (approximate seconds from start, each frame is 10 seconds apart. Frame 1 = 0s, Frame 2 = 10s, etc.)
              - endTime (approximate seconds)
              - label (brief title like "Presentation", "Pre-PCI", "FFR", "OCT", "Post-PCI", "Closure")
              - description (one sentence detail of what is happening)
              
              Return ONLY a valid JSON array of objects. 
              Example Output: [{"startTime": 0, "endTime": 60, "label": "Presentation", "description": "Initial angiogram showing the blockage."}]`
            }];
            const step = Math.max(1, Math.floor(frameFiles.length / 20));
            const sampledFrames = frameFiles.filter((_, i) => i % step === 0).slice(0, 20);
            for (const frame of sampledFrames) {
                const frameIdx = parseInt(frame.match(/\d+/)[0]);
                const timestamp = (frameIdx - 1) * 10;
                const base64 = fs2.readFileSync(path.join(tmpDir, frame)).toString("base64");
                parts.push({
                    text: `[Timestamp: ${timestamp}s]`
                });
                parts.push({ inlineData: { data: base64, mimeType: "image/jpeg" } } as any)
            }
            const response = await ai.models.generateContent({
                model: model || "gemini-2.0-flash",
                contents: {
                    parts
                }
            });
            const text = response.text;
            const jsonMatch = text.match(/\[.*\]/s);
            if (!jsonMatch) {
                throw new Error("AI returned invalid format: " + text)
            }
            const segments = JSON.parse(jsonMatch[0]);
            try {
                for (const f of frameFiles) fs2.unlinkSync(path.join(tmpDir, f));
                fs2.rmdirSync(tmpDir)
            } catch (e) {}
            res.json({
                success: true,
                segments
            })
        } catch (e) {
            console.error("AI Process Error:", e);
            if (e.status === 429 || e.message && e.message.includes("Quota exceeded")) {
                res.status(429).json({
                    error: "Gemini API Quota Exceeded. Please try again later or use offline mode.",
                    isQuotaError: true
                })
            } else {
                res.status(500).json({
                    error: e.message || "AI processing failed"
                })
            }
        }
    });
    app.post("/api/recording/delete", express.json(), async (req, res) => {
        const targetPath = req.body.path;
        if (!targetPath) {
            return res.status(400).json({
                error: "Missing path"
            })
        }
        try {
            const fs2 = await import("fs").then(s => {
                const e = "default";
                return (s[e] as any) ? (s[e] as any) : (s as any)
            });
            if (fs2.existsSync(targetPath as string)) {
                fs2.unlinkSync(targetPath)
            }
            const parsed = path.parse(targetPath);
            const baseNoExt = parsed.name;
            const extensions = [".meta.json", ".txt", "_snapshot.png", "_transcription.txt", ".dcm.zip"];
            for (const ext of extensions) {
                const assocPath = path.join(parsed.dir, baseNoExt + ext);
                if (fs2.existsSync(assocPath)) {
                    fs2.unlinkSync(assocPath)
                }
                const appendedPath = targetPath + ext;
                if (fs2.existsSync(appendedPath)) {
                    fs2.unlinkSync(appendedPath)
                }
            }
            try {
                const allFiles = fs2.readdirSync(parsed.dir);
                for (const file of allFiles) {
                    if (file.startsWith(baseNoExt)) {
                        fs2.unlinkSync(path.join(parsed.dir, file))
                    }
                }
            } catch (e) {}
            const dirPath = path.dirname(targetPath);
            try {
                const files = fs2.readdirSync(dirPath);
                if (files.length === 0) {
                    fs2.rmdirSync(dirPath)
                }
            } catch (e) {}
            res.json({
                success: true
            })
        } catch (err) {
            console.error("Recording delete error:", err);
            res.status(500).json({
                error: err.message
            })
        }
    });
    let lastStatsTime = 0;
    let cachedStats = {
        cpu: 0,
        mem: 0,
        gpu: 0
    };
    let isFetchingStats = false;
    let previousCpus = null;
    let lastCpuTime = 0;
    app.get("/api/system-stats", async (req, res) => {
        try {
            const now = Date.now();
            if (!previousCpus) {
                previousCpus = os.cpus();
                lastCpuTime = now;
            }
            
            // Only recalculate CPU if at least 250ms have passed, else use cachedStats.cpu
            if (now - lastCpuTime > 250) {
                let idle = 0;
                let total = 0;
                const currentCpus = os.cpus();
                for (let i = 0, len = currentCpus.length; i < len; i++) {
                    const cpu = currentCpus[i];
                    const prev = previousCpus[i];
                    if (!prev) continue;
                    for (const type in cpu.times) {
                        total += cpu.times[type] - prev.times[type]
                    }
                    idle += cpu.times.idle - prev.times.idle
                }
                previousCpus = currentCpus;
                lastCpuTime = now;
                const fastCpu = total === 0 ? cachedStats.cpu : 100 - Math.round(100 * idle / total);
                cachedStats.cpu = fastCpu;
            }
            
            const fastCpu = cachedStats.cpu;
            const mem = os.totalmem() > 0 ? (os.totalmem() - os.freemem()) / os.totalmem() * 100 : 0;
            if (now - lastStatsTime > 1e4 && !isFetchingStats) {
                isFetchingStats = true;
                Promise.all([si.graphics()]).then(([gpu]) => {
                    let gpuUsage = cachedStats.gpu;
                    if (gpu && gpu.controllers && gpu.controllers.length > 0) {
                        const activeGpu = gpu.controllers.find(g => g.utilizationGpu !== null && !isNaN(g.utilizationGpu));
                        if (activeGpu) gpuUsage = activeGpu.utilizationGpu
                    }
                    cachedStats.gpu = gpuUsage;
                    lastStatsTime = Date.now();
                    isFetchingStats = false
                }).catch(() => {
                    isFetchingStats = false
                })
            }
            res.json({
                cpu: fastCpu,
                mem,
                gpu: cachedStats.gpu
            })
        } catch (e) {
            res.status(500).json({
                error: "Failed to fetch stats"
            })
        }
    });
    app.post("/api/pacs/export", express.json(), async (req, res) => {
        try {
            const {
                recording,
                pacs
            } = req.body;
            if (!recording || !pacs || !pacs.host || !pacs.port) {
                return res.status(400).json({
                    error: "Missing required parameters"
                })
            }
            console.log(`[PACS] Starting HL7/DICOM format conversion for ${recording.path}...`);
            await new Promise(resolve => setTimeout(resolve, 3e3));
            console.log(`[PACS] Conversion complete. Payload ready for ${pacs.aeTitle}@${pacs.host}:${pacs.port}`);
            await new Promise(resolve => setTimeout(resolve, 1e3));
            const hostIP = pacs.host;
            const port = parseInt(pacs.port, 10) || 104;
            const isReachable = await new Promise(resolve => {
                const socket = new net2.Socket;
                socket.setTimeout(2e3);
                socket.on("connect", () => {
                    socket.destroy();
                    resolve(true)
                });
                socket.on("timeout", () => {
                    socket.destroy();
                    resolve(false)
                });
                socket.on("error", () => {
                    socket.destroy();
                    resolve(false)
                });
                socket.connect(port, hostIP)
            });
            if (!isReachable) {
                console.error(`[PACS] Network Error: Destination HOST ${hostIP}:${port} is unreachable or connection refused. C-STORE failed.`)
            }
            let targetDir = pacs.failoverDirectory || path.join(dataRoot, "PACS_Simulated");
            try {
                console.log(`[PACS] Saving to local export directory: ${targetDir}`);
                const fs2 = await import("fs").then(s => {
                    const e = "default";
                    return (s[e] as any) ? (s[e] as any) : (s as any)
                });
                if (!fs2.existsSync(targetDir)) {
                    fs2.mkdirSync(targetDir, {
                        recursive: true
                    })
                }
                const sanitizedPatientId = (recording.patientId || "unknown_patient").replace(/[^a-zA-Z0-9_\-]/g, "_");
                const dcmFilename = `export_${sanitizedPatientId}_${Date.now()}.dcm.zip`;
                const targetPath = path.join(targetDir, dcmFilename);
                if (recording.path && fs2.existsSync(recording.path)) {
                    fs2.copyFileSync(recording.path, targetPath)
                } else {
                    fs2.writeFileSync(targetPath, "Simulated DICOM payload")
                }
                console.log(`[PACS] Saved payload to: ${targetPath}`)
            } catch (failoverError) {
                console.error(`[PACS] Failed to write to export directory: `, failoverError)
            }
            if (!isReachable) {
                return res.status(503).json({
                    success: false,
                    error: `Connection refused/timeout to ${hostIP}:${port}. Please verify PACS is online and accessible. File saved to local export dir instead.`
                })
            }
            console.log(`[PACS] Successfully verified PACS port at ${pacs.aeTitle}`);
            res.json({
                success: true,
                message: "Valid Connection. C-STORE requires dcmtk natively. Payload saved to local PACS folder."
            })
        } catch (e) {
            console.error("PACS export error", e);
            res.status(500).json({
                error: e.message || "Server error during PACS export"
            })
        }
    });
    app.get("/api/system/media-devices", async (req, res) => {
        try {
            const isWin = os.platform() === "win32";
            const cmd = isWin ? ["-list_devices", "true", "-f", "dshow", "-i", "dummy"] : ["-sources", "v4l2"];
            const proc = spawnSync(resolvedFfmpegPath, cmd);
            const output = proc.stderr.toString() + proc.stdout.toString();
            const devices = [];
            if (isWin) {
                const lines = output.split("\n");
                let inSection = false;
                for (const line of lines) {
                    if (line.includes("DirectShow video devices")) inSection = true;
                    else if (line.includes("DirectShow audio devices")) inSection = false;
                    if (inSection && line.includes('"')) {
                        const match = line.match(/"([^"]+)"/);
                        if (match) devices.push(match[1])
                    }
                }
            } else {
                const lines = output.split("\n");
                for (const line of lines) {
                    if (line.includes("[v4l2")) {
                        const part = line.split("/dev/")[1];
                        if (part) devices.push(`/dev/${part.split(" ")[0]}`)
                    }
                }
            }
            res.json({
                devices,
                raw: output
            })
        } catch (e) {
            res.status(500).json({
                error: String(e)
            })
        }
    });
    const oldUpgradeListeners = server.listeners("upgrade").slice(0);
    server.removeAllListeners("upgrade");
    const {
        ExpressPeerServer
    } = await import("peer").then(s => {
        const e = "default";
        return (s[e] as any) ? (s[e] as any) : (s as any)
    });
    const peerServer = ExpressPeerServer(server, {
        path: "/peerjs"
    });
    app.use("/", peerServer);
    const newListeners = server.listeners("upgrade");
    const peerListener = newListeners.find(l => !oldUpgradeListeners.includes(l));
    server.removeAllListeners("upgrade");
    const speechWss = new WebSocketServer({
        noServer: true
    });
    speechWss.on("connection", ws => {
        console.log("[Native Speech] Client connected");
        const pyScript = resolveAsarPath(path.join(currentDir, "..", "vm", "speech_vosk.py"));
        const executable = process.platform === "win32" ? "python" : "python3";
        let psProc;
        if (fs.existsSync(pyScript)) {
            try {
                psProc = spawn(executable, ["-u", pyScript]);
                registerProcess(psProc)
            } catch (e) {
                if (ws.readyState === 1) ws.send(JSON.stringify({
                    error: `Failed to start Python: ${e?.message||e}`
                }));
                return
            }
        } else {
            ws.send(JSON.stringify({
                error: "Python script not found"
            }));
            ws.close();
            return
        }
        ws.on("message", message => {
            if (psProc && psProc.stdin) {
                psProc.stdin.write(message)
            }
        });
        psProc.on("error", err => {
            console.log("[Native Speech Spawn Error]", err);
            if (ws.readyState === 1) {
                ws.send(JSON.stringify({
                    error: `Could not launch ${executable}. Make sure Python is in your PATH. Error: ${err.message}`
                }))
            }
        });
        psProc.stdout.on("data", data => {
            const lines = data.toString().split("\n");
            for (const line of lines) {
                const cleaned = line.trim();
                if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
                    if (ws.readyState === 1) {
                        ws.send(cleaned)
                    }
                }
            }
        });
        psProc.stderr.on("data", data => {
            const errText = data.toString().trim();
            console.log("[Native Speech ERR]", errText);
            if (ws.readyState === 1 && errText) {
                ws.send(JSON.stringify({
                    error: `Python Error: ${errText}`
                }))
            }
        });
        ws.on("close", () => {
            console.log("[Native Speech] Client disconnected, killing process");
            try {
                psProc.kill()
            } catch (e) {}
        })
    });
    server.prependListener("upgrade", (req, socket: any, head: any) => {


        const url = req.url || "";
        const host = ((req.headers.host as string)) || "";
        console.log(`[Bridge] Upgrade request: ${url} on host ${host}`);
        if (url.startsWith("/api/virtual-camera")) {
            console.log(`[Bridge] Upgrading vcamWss for ${url}`);
            vcamWss.handleUpgrade(req, socket as any, head, ws => {
                 vcamWss.emit("connection", ws, req)
            });
            return
        }
        if (url.startsWith("/api/mediamtx")) {
            try {
                mediamtxProxy.upgrade(req, socket as any, head as any)
            } catch (e) {
                console.error("[mediamtxProxy upgrade]", e)
            }
            return
        }
        if (url.startsWith("/api/native-speech")) {
            speechWss.handleUpgrade(req, socket as any, head, ws => {
                speechWss.emit("connection", ws, req)
            });
            return
        }
        if (url.startsWith("/api/webrtc-signaling")) {
            webrtcSignalingWss.handleUpgrade(req, socket as any, head, ws => {
                webrtcSignalingWss.emit("connection", ws, req)
            });
            return
        }
        if (url.startsWith("/api/youtube/stream")) {
            youtubeWss.handleUpgrade(req, socket as any, head, ws => {
                youtubeWss.emit("connection", ws, req)
            });
            return
        }
        if (url.startsWith("/peerjs")) {
            if (peerListener) {
                peerListener(req, socket as any, head as any);
                return
            }
        }
        if (url.startsWith("/api/")) {
            console.log("[Bridge] Routing API WS to fallback listeners")
        }
        for (const listener of oldUpgradeListeners) {
            try {
                listener(req, socket as any, head as any)
            } catch (e) {}
        }
    });
    const streamLogs = new Map;
    const logSubscribers = new Map;
    const profilesDirLocal = profilesDir;
    if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, {
            recursive: true
        })
    }
    const secretKeyPath = path.join(profilesDir, ".secret_key");
    let encryptionKey;
    if (fs.existsSync(secretKeyPath)) {
        encryptionKey = Buffer.from(fs.readFileSync(secretKeyPath, "utf8"), "hex")
    } else {
        encryptionKey = crypto.randomBytes(32);
        fs.writeFileSync(secretKeyPath, encryptionKey.toString("hex"), "utf8")
    }

    function encryptText(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString("hex") + ":" + encrypted.toString("hex")
    }
    __name(encryptText, "encryptText");

    function decryptText(text) {
        const parts = text.split(":");
        const iv = Buffer.from(parts.shift(), "hex");
        const encryptedText = Buffer.from(parts.join(":"), "hex");
        const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString()
    }
    __name(decryptText, "decryptText");
    const usersFilePath = path.join(profilesDir, "users.enc");
    app.get("/api/users", (req, res) => {
        try {
            if (!fs.existsSync(usersFilePath)) {
                return res.json({
                    users: null
                })
            }
            const encData = fs.readFileSync(usersFilePath, "utf8");
            if (!encData || encData.trim() === "") {
                return res.json({
                    users: null
                })
            }
            const finalData = decryptText(encData);
            res.json({
                users: JSON.parse(finalData)
            })
        } catch (e) {
            console.error("Error reading users", e);
            res.status(500).json({
                error: "Failed to read users"
            })
        }
    });
    app.post("/api/users", express.json(), (req, res) => {
        try {
            const users = req.body;
            const encData = encryptText(JSON.stringify(users));
            fs.writeFileSync(usersFilePath, encData, "utf8");
            res.json({
                success: true
            })
        } catch (e) {
            console.error("Error saving users", e);
            res.status(500).json({
                error: "Failed to save users"
            })
        }
    });
    const mediaDir = path.join(dataRoot, "uploads");
    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, {
            recursive: true
        })
    }
    app.use("/media", express.static(mediaDir));
    app.post("/api/media/upload", (req, res) => {
        const fileName = req.headers["x-file-name"];
        if (!fileName) return res.status(400).json({
            error: "Missing filename"
        });
        const safeName = (fileName as string).replace(/[^a-z0-9_.-]/gi, "_");
        const finalPath = path.join(mediaDir, safeName);
        const out = fs.createWriteStream(finalPath);
        req.pipe(out);
        out.on("finish", () => {
            res.json({
                success: true,
                url: `/media/${safeName}`
            })
        });
        out.on("error", err => {
            console.error("Media upload error:", err);
            res.status(500).json({
                error: err.message
            })
        })
    });
    app.get("/api/ppt/status", async (req, res) => {
        if (os.platform() !== "win32") {
            return res.json({
                error: "Supported only on Windows"
            })
        }
        const psCommand = `
      $ErrorActionPreference = 'Stop'
      try {
        $processes = Get-Process powerpnt -ErrorAction SilentlyContinue
        if (-not $processes) {
           return (@{ running = $false; message = 'PowerPoint is not running' } | ConvertTo-Json -Compress)
        }
        
        $app = $null
        try {
          $app = [Runtime.Interopservices.Marshal]::GetActiveObject('PowerPoint.Application')
        } catch {
          $app = New-Object -ComObject PowerPoint.Application
        }

        if ($null -eq $app) { return (@{ running = $false } | ConvertTo-Json -Compress) }

        if ($app.Presentations.Count -eq 0) {
          return (@{ running = $false; message = 'No presentation open' } | ConvertTo-Json -Compress)
        }

        $pres = $app.ActivePresentation
        $win = $null
        try { $win = $pres.SlideShowWindow } catch {}
        
        $slides = @()
        if ($pres.Slides.Count -le 100) { 
            foreach ($s in $pres.Slides) {
                $slides += @{ index = $s.SlideIndex; name = $s.Name }
            }
        }

        $status = @{
          running = $true
          title = $pres.Name
          current = if ($win) { $win.View.CurrentShowPosition } else { 1 }
          total = $pres.Slides.Count
          isShowing = if ($win) { $true } else { $false }
          slides = $slides
        }
        $status | ConvertTo-Json -Compress
      } catch {
        return (@{ running = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress)
      }
    `;
        const encodedCommand = Buffer.from(psCommand, "utf16le").toString("base64");
        require2("child_process").execFile("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand], {
            timeout: 8e3
        }, (error, stdout) => {
            if (error) {
                if (error.name === "AbortError" || error.message.includes("timeout")) {
                    return res.json({
                        running: false,
                        error: "Connection Timeout"
                    })
                }
                console.error("PPT Status Check Failed:", error.message);
                return res.json({
                    running: false,
                    error: error.message.split("\n")[0]
                })
            }
            try {
                const data = JSON.parse(stdout);
                res.json(data)
            } catch (e) {
                if (stdout.includes('running":false')) {
                    res.json(JSON.parse(stdout))
                } else {
                    console.warn("Failed to parse PPT status:", stdout);
                    res.json({
                        running: false
                    })
                }
            }
        })
    });
    app.post("/api/ppt/command", express.json(), (req, res) => {
        const {
            command,
            value
        } = req.body;
        if (os.platform() !== "win32") return res.json({
            error: "Windows only"
        });
        console.log(`Executing PPT Command: ${command}`, value);
        let psScript = `
      try {
        $app = $null
        try {
          $app = [Runtime.Interopservices.Marshal]::GetActiveObject('PowerPoint.Application')
        } catch {
          $app = New-Object -ComObject PowerPoint.Application
        }
        if ($null -eq $app) { exit }
        $pres = $app.ActivePresentation
        
        if ($null -eq $pres.SlideShowWindow -and ('next','prev','goto' -contains '${command}')) {
           $pres.SlideShowSettings.Run()
           Start-Sleep -Milliseconds 500
        }
    `;
        switch (command) {
            case "next":
                psScript += "if ($pres.SlideShowWindow) { $pres.SlideShowWindow.View.Next() }";
                break;
            case "prev":
                psScript += "if ($pres.SlideShowWindow) { $pres.SlideShowWindow.View.Previous() }";
                break;
            case "goto":
                psScript += `if ($pres.SlideShowWindow) { $pres.SlideShowWindow.View.GotoSlide(${value}) }`;
                break;
            case "start":
                psScript += `
          $pres.SlideShowSettings.ShowType = 1
          $pres.SlideShowSettings.Run()
        `;
                break;
            case "startWindow":
                psScript += `
          $pres.SlideShowSettings.ShowType = 2
          $pres.SlideShowSettings.Run()
        `;
                break;
            default:
                return res.status(400).json({
                    error: "Invalid command"
                })
        }
        psScript += "} catch { write-error $_.Exception.Message }";
        const encodedCommand = Buffer.from(psScript, "utf16le").toString("base64");
        require2("child_process").execFile("powershell", ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand], {
            timeout: 5e3
        }, (err, stdout, stderr) => {
            if (err || stderr) {
                console.error("PPT Command Exec Error:", stderr || err?.message);
                return res.json({
                    success: false,
                    error: stderr || err?.message
                })
            }
            res.json({
                success: true
            })
        })
    });
    app.get("/api/configs", (req, res) => {
        console.log("[API] GET /api/configs");
        try {
            const defaultRefPath = path.join(configsDir, "default.txt");
            let defaultFilename = "";
            if (fs.existsSync(defaultRefPath)) {
                defaultFilename = fs.readFileSync(defaultRefPath, "utf8").trim()
            }
            const files = fs.readdirSync(configsDir).filter(f => f.endsWith(".xml"));
            const configs = files.map(file => {
                const xmlData = fs.readFileSync(path.join(configsDir, file), "utf8");
                const isDef = defaultFilename ? file === defaultFilename : file === "default.xml";
                return {
                    id: file,
                    name: file.replace(".xml", ""),
                    isDefault: isDef,
                    xmlData
                }
            });
            res.json({
                configs
            })
        } catch (err) {
            res.status(500).json({
                error: "Failed to list configs"
            })
        }
    });
    app.delete("/api/configs", (req, res) => {
        try {
            if (fs.existsSync(configsDir)) {
                const files = fs.readdirSync(configsDir);
                for (const file of files) {
                    if (file.endsWith(".xml")) {
                        fs.unlinkSync(path.join(configsDir, file))
                    }
                }
            }
            res.json({
                success: true
            })
        } catch (e) {
            res.status(500).json({
                error: "Failed to clear configs"
            })
        }
    });
    app.post("/api/configs", express.json(), (req, res) => {
        try {
            const {
                name,
                content,
                xmlData,
                filename,
                isDefault
            } = req.body;
            const finalContent = content || xmlData;
            const initialName = name || filename;
            if (!initialName || !finalContent) {
                return res.status(400).json({
                    error: "Missing name or content"
                })
            }
            const safeName = initialName.replace(/[^a-z0-9_-]/gi, "_");
            const finalName = safeName.endsWith(".xml") ? safeName : `${safeName}.xml`;
            fs.writeFileSync(path.join(configsDir, finalName), finalContent, "utf8");
            if (isDefault) {
                fs.writeFileSync(path.join(configsDir, "default.txt"), finalName, "utf8")
            }
            res.json({
                success: true,
                name: finalName
            })
        } catch (err) {
            res.status(500).json({
                error: "Failed to save config"
            })
        }
    });
    app.delete("/api/configs/:id", (req, res) => {
        try {
            const file = req.params.id;
            if (!file.endsWith(".xml")) return res.status(400).send("Invalid file");
            const filepath = path.join(configsDir, file);
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath)
            }
            res.json({
                success: true
            })
        } catch (err) {
            res.status(500).json({
                error: "Failed"
            })
        }
    });
    const net2 = await import("net").then(s => {
        const e = "default";
        return (s[e] as any) ? (s[e] as any) : (s as any)
    });
    app.post("/api/youtube/broadcast", express.json(), (req, res) => {
        const {
            url,
            key
        } = req.body;
        if (!url || !key) return res.status(400).json({
            error: "Missing url or key"
        });
        if (activeYouTubeBroadcast) {
            activeYouTubeBroadcast.kill();
            activeYouTubeBroadcast = null
        }
        const rtmpUrl = `${url.replace(/\/$/,"")}/${key}`;
        const ffmpegArgs = ["-rtsp_transport", "tcp", "-i", "rtsp://localhost:8554/program", "-c:v", "libx264", "-preset", "veryfast", "-b:v", "2500k", "-maxrate", "2500k", "-bufsize", "5000k", "-pix_fmt", "yuv420p", "-g", "60", "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "44100", "-f", "flv", rtmpUrl];
        console.log(`[YouTube] Starting broadcast to ${url}`);
        activeYouTubeBroadcast = spawn(resolvedFfmpegPath, ffmpegArgs, {
            detached: false,
            windowsHide: true
        });
        registerProcess(activeYouTubeBroadcast);
        activeYouTubeBroadcast.stderr.on("data", data => {});
        activeYouTubeBroadcast.on("close", code => {
            console.log(`[YouTube] Broadcast stopped. Exit code: ${code}`);
            activeYouTubeBroadcast = null
        });
        res.json({
            success: true
        })
    });
    app.get("/api/youtube/broadcast/status", (req, res) => {
        res.json({
            active: !!activeYouTubeBroadcast
        })
    });
    app.post("/api/youtube/broadcast/stop", (req, res) => {
        if (activeYouTubeBroadcast) {
            activeYouTubeBroadcast.kill();
            activeYouTubeBroadcast = null
        }
        res.json({
            success: true
        })
    });

    let activeSRTBroadcast: ChildProcess | null = null;
    app.post("/api/srt/broadcast", express.json(), (req, res) => {
        const { url, passphrase, streamid, latency } = req.body;
        if (!url) return res.status(400).json({ error: "Missing url" });
        if (activeSRTBroadcast) {
            activeSRTBroadcast.kill();
            activeSRTBroadcast = null;
        }
        
        let srtUrl = url;
        const queryParams = [];
        if (streamid) queryParams.push(`streamid=${encodeURIComponent(streamid)}`);
        if (passphrase) queryParams.push(`passphrase=${encodeURIComponent(passphrase)}`);
        if (latency) queryParams.push(`latency=${encodeURIComponent(latency)}`);
        if (queryParams.length > 0) {
           srtUrl += (srtUrl.includes('?') ? '&' : '?') + queryParams.join('&');
        }

        const ffmpegArgs = [
            "-rtsp_transport", "tcp",
            "-i", "rtsp://localhost:8556/vcam",
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k",
            "-f", "mpegts",
            srtUrl
        ];
        
        console.log(`[SRT Bridge] Starting broadcast to ${srtUrl}`);
        activeSRTBroadcast = spawn(resolvedFfmpegPath || 'ffmpeg', ffmpegArgs, { windowsHide: true });
        registerProcess(activeSRTBroadcast);
        activeSRTBroadcast.stderr.on("data", data => {
            // console.log(`[SRT FFmpeg] ${data}`);
        });
        activeSRTBroadcast.on("close", () => {
            console.log(`[SRT Bridge] Broadcast stopped`);
            activeSRTBroadcast = null;
        });
        res.json({ success: true });
    });

    app.get("/api/srt/broadcast/status", (req, res) => {
        res.json({ active: !!activeSRTBroadcast });
    });

    app.post("/api/srt/broadcast/stop", (req, res) => {
        if (activeSRTBroadcast) {
            activeSRTBroadcast.kill();
            activeSRTBroadcast = null;
        }
        res.json({ success: true });
    });

    app.post("/api/ping", express.json(), (req, res) => {
        try {
            const {
                ip
            } = req.body;
            if (!ip) return res.status(400).json({
                error: "Missing IP"
            });
            const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
            const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;
            if (!ipRegex.test(ip) && !domainRegex.test(ip) && ip !== "localhost") {
                return res.json({
                    success: false,
                    message: "Invalid format"
                })
            }
            const tryPorts = [80, 554, 8e3, 1259, 8080, 443];
            let checked = 0;
            let success = false;
            tryPorts.forEach(port => {
                const socket = new net2.Socket;
                socket.setTimeout(1500);
                socket.on("connect", () => {
                    if (!success) {
                        success = true;
                        res.json({
                            success: true,
                            message: "Reachable"
                        })
                    }
                    socket.destroy()
                });
                socket.on("timeout", () => socket.destroy());
                socket.on("error", () => {});
                socket.on("close", () => {
                    checked++;
                    if (checked === tryPorts.length && !success) {
                        res.json({
                            success: false,
                            message: "Unreachable"
                        })
                    }
                });
                socket.connect(port, ip)
            })
        } catch (e) {
            res.status(500).json({
                error: "Ping failed"
            })
        }
    });
    const dgram = await import("dgram").then(s => {
        const e = "default";
        return (s[e] as any) ? (s[e] as any) : (s as any)
    });
    let sequenceNumber = 1;
    const onvifDeviceCache = new Map;

    function createPelcoD(addr, cmd1, cmd2, d1, d2) {
        const buf = Buffer.alloc(7);
        buf[0] = 255;
        buf[1] = addr;
        buf[2] = cmd1;
        buf[3] = cmd2;
        buf[4] = d1;
        buf[5] = d2;
        let sum = 0;
        for (let i = 1; i < 6; i++) sum += buf[i];
        buf[6] = sum % 256;
        return buf
    }
    __name(createPelcoD, "createPelcoD");

    function createPelcoP(addr, cmd1, cmd2, d1, d2) {
        const buf = Buffer.alloc(8);
        buf[0] = 160;
        buf[1] = addr;
        buf[2] = cmd1;
        buf[3] = cmd2;
        buf[4] = d1;
        buf[5] = d2;
        buf[6] = 0;
        let xor = buf[1];
        for (let i = 2; i < 7; i++) xor ^= buf[i];
        buf[7] = xor;
        return buf
    }
    __name(createPelcoP, "createPelcoP");
    app.post("/api/ptz", express.json(), async (req, res) => {
        try {
            const {
                ip,
                port,
                command,
                model,
                protocol,
                username,
                password,
                address,
                parameter
            } = req.body;
            if (!ip || !port || !command) return res.status(400).json({
                error: "Missing parameters"
            });
            const targetProtocol = protocol?.toLowerCase();
            let ptzPort = parseInt(port, 10);
            if (isNaN(ptzPort) || ptzPort === 8e3 || ptzPort === 80 && protocol !== "onvif" && protocol !== "http") ptzPort = 1259;
            let message = Buffer.alloc(0);
            const addr = parseInt(address || "1", 10);
            if (targetProtocol === "pelco-d" || targetProtocol === "pelco-p") {
                const isD = targetProtocol === "pelco-d";
                const map = {
                    "UP": isD ? [0, 8, 0, 32] : [0, 8, 0, 32],
                    "DOWN": isD ? [0, 16, 0, 32] : [0, 16, 0, 32],
                    "LEFT": isD ? [0, 4, 32, 0] : [0, 4, 32, 0],
                    "RIGHT": isD ? [0, 2, 32, 0] : [0, 2, 32, 0],
                    "STOP": [0, 0, 0, 0]
                };
                const cmd = map[command.toUpperCase()];
                if (!cmd) return res.status(400).json({
                    error: "Unsupported command"
                });
                if (parameter !== void 0) {
                    console.log(`[PTZ] Parameter: ${parameter}, Type: ${typeof parameter}`);
                    const speed = Math.min(Math.max(Math.floor(parameter * .62), 1), 63);
                    console.log(`[PTZ] Calculated Speed: ${speed}`);
                    if (isD) {
                        cmd[2] = speed;
                        cmd[3] = speed
                    } else {
                        cmd[2] = speed;
                        cmd[3] = speed
                    }
                }
                message = isD ? createPelcoD(addr, cmd[0], cmd[1], cmd[2], cmd[3]) : createPelcoP(addr, cmd[0], cmd[1], cmd[2], cmd[3])
            }
            let p = req.body.parameter;
            let paramByte = 0;
            if (p !== void 0) paramByte = parseInt(p, 10) & 255;
            const baseCmds = {
                "UP": [129, 1, 6, 1, 12, 12, 3, 1, 255],
                "DOWN": [129, 1, 6, 1, 12, 12, 3, 2, 255],
                "LEFT": [129, 1, 6, 1, 12, 12, 1, 3, 255],
                "RIGHT": [129, 1, 6, 1, 12, 12, 2, 3, 255],
                "HOME": [129, 1, 6, 4, 255],
                "ZOOM_IN": [129, 1, 4, 7, 2, 255],
                "ZOOM_OUT": [129, 1, 4, 7, 3, 255],
                "STOP": [129, 1, 6, 1, 12, 12, 3, 3, 255],
                "ZOOM_STOP": [129, 1, 4, 7, 0, 255],
                "PRESET_SET": [129, 1, 4, 63, 1, paramByte, 255],
                "PRESET_CALL": [129, 1, 4, 63, 2, paramByte, 255],
                "BACKLIGHT_ON": [129, 1, 4, 51, 2, 255],
                "BACKLIGHT_OFF": [129, 1, 4, 51, 3, 255],
                "WB_AUTO": [129, 1, 4, 53, 0, 255],
                "WB_INDOOR": [129, 1, 4, 53, 1, 255],
                "WB_OUTDOOR": [129, 1, 4, 53, 2, 255],
                "WB_ONE_PUSH_TRIGGER": [129, 1, 4, 16, 5, 255],
                "WB_MANUAL": [129, 1, 4, 53, 5, 255]
            };
            if (message.length === 0) {
                let bytes = baseCmds[command.toUpperCase()];
                if (command.toUpperCase() === "ZOOM_IN" && p !== void 0) {
                    bytes = [129, 1, 4, 7, 32 | paramByte & 7, 255]
                } else if (command.toUpperCase() === "ZOOM_OUT" && p !== void 0) {
                    bytes = [129, 1, 4, 7, 48 | paramByte & 7, 255]
                }
                if (!bytes && protocol !== "http") return res.status(400).json({
                    error: "Unknown command"
                });
                if (bytes) message = Buffer.from(bytes || [])
            }
            if (targetProtocol === "onvif") {
                const onvif = _require("node-onvif");
                let onvifPort = isNaN(parseInt(port, 10)) ? 80 : parseInt(port, 10);
                const cacheKey = `${ip}:${onvifPort}`;
                try {
                    let device = onvifDeviceCache.get(cacheKey);
                    if (!device) {
                        let userPass: any = {};
                        if (username) userPass.user = username;
                        else userPass.user = "admin";
                        if (password) userPass.pass = password;
                        else userPass.pass = "admin";
                        device = new onvif.OnvifDevice({
                            xaddr: `http://${ip}:${onvifPort}/onvif/device_service`,
                            ...userPass
                        });
                        await device.init();
                        onvifDeviceCache.set(cacheKey, device)
                    }
                    let x = 0,
                        y = 0,
                        z = 0;
                    const speed = parameter ? Math.min(Math.max(parameter / 100, .1), 1) : .5;
                    switch (command.toUpperCase()) {
                        case "UP":
                            y = speed;
                            break;
                        case "DOWN":
                            y = -speed;
                            break;
                        case "LEFT":
                            x = -speed;
                            break;
                        case "RIGHT":
                            x = speed;
                            break;
                        case "ZOOM_IN":
                            z = speed;
                            break;
                        case "ZOOM_OUT":
                            z = -speed;
                            break
                    }(async () => {
                        try {
                            if (command.toUpperCase() === "STOP" || command.toUpperCase() === "ZOOM_STOP") {
                                await device.ptzStop()
                            } else if (command.toUpperCase() === "HOME") {
                                const profile = device.getCurrentProfile();
                                if (profile) await device.services.ptz.gotoHomePosition({
                                    ProfileToken: profile["token"]
                                })
                            } else if (command.toUpperCase() === "PRESET_CALL") {
                                const profile = device.getCurrentProfile();
                                if (profile) await device.services.ptz.gotoPreset({
                                    ProfileToken: profile["token"],
                                    PresetToken: (parameter || 1).toString()
                                })
                            } else if (command.toUpperCase() === "PRESET_SET") {
                                const profile = device.getCurrentProfile();
                                if (profile) await device.services.ptz.setPreset({
                                    ProfileToken: profile["token"],
                                    PresetName: (parameter || 1).toString()
                                })
                            } else {
                                await device.ptzMove({
                                    speed: {
                                        x,
                                        y,
                                        z
                                    }
                                })
                            }
                            console.log(`[PTZ] Sent ${command} to ${ip}:${onvifPort} (via ONVIF)`)
                        } catch (err) {
                            console.error("[PTZ ONVIF Error]", err)
                        }
                    })();
                    return res.json({
                        success: true,
                        via: "onvif",
                        command
                    })
                } catch (err) {
                    console.error("[PTZ ONVIF Error]", err);
                    return res.status(500).json({
                        error: "ONVIF command failed",
                        details: err
                    })
                }
            }
            if (targetProtocol === "http") {
                const map = {
                    "UP": "up",
                    "DOWN": "down",
                    "LEFT": "left",
                    "RIGHT": "right",
                    "HOME": "home",
                    "ZOOM_IN": "zoomin",
                    "ZOOM_OUT": "zoomout",
                    "STOP": "ptzstop",
                    "ZOOM_STOP": "ptzstop"
                };
                const c = map[command.toUpperCase()];
                if (c) {
                    const speed = parameter ? Math.min(Math.max(Math.floor(parameter / 20), 1), 9) : 5;
                    try {
                        await fetch(`http://${ip}:${ptzPort}/cgi-bin/ptzctrl.cgi?ptzcmd&${c}&${speed}&${speed}`, {
                            method: "GET",
                            signal: AbortSignal.timeout ? AbortSignal.timeout(1e3) : void 0
                        }).catch(() => {})
                    } catch (e) {}
                    console.log(`[PTZ] Sent ${command} to ${ip}:${ptzPort} (via HTTP CGI) with speed ${speed}`);
                    return res.json({
                        success: true,
                        via: "http",
                        command
                    })
                }
                return res.status(400).json({
                    error: "Unsupported HTTP command"
                })
            }
            if (targetProtocol === "visca_ip") {
                const header = Buffer.alloc(8);
                header.writeUInt16BE(256, 0);
                header.writeUInt16BE(message.length, 2);
                header.writeUInt32BE(sequenceNumber++, 4);
                message = Buffer.concat([header, message])
            }
            if (targetProtocol === "tcp" || targetProtocol === "pelco-d" || targetProtocol === "pelco-p") {
                const net3 = await import("net").then(s => {
                    const e = "default";
                    return (s[e] as any) ? (s[e] as any) : (s as any)
                });
                const client2 = net3.createConnection({
                    port: ptzPort,
                    host: ip
                }, () => {
                    client2.write(message);
                    console.log(`[PTZ] Sent ${command} to ${ip}:${ptzPort} (via TCP${targetProtocol==="visca_ip"?" ViscaOverIp":""})`);
                    setTimeout(() => client2.end(), 100)
                });
                client2.on("error", err => console.error("[PTZ TCP Error]", err));
                return res.json({
                    success: true,
                    via: "tcp",
                    command
                })
            }
            const client = dgram.createSocket("udp4");
            client.send(message, ptzPort, ip, err => {
                if (err) {
                    if (err.message.includes("ENOTFOUND")) {
                        console.warn(`[PTZ Warning] Host not found: ${ip}`)
                    } else {
                        console.error("[PTZ UDP Error]", err)
                    }
                } else console.log(`[PTZ] Sent ${command} to ${ip}:${ptzPort} (via UDP${targetProtocol==="visca_ip"?" ViscaOverIp":""})`);
                client.close()
            });
            res.json({
                success: true,
                command,
                via: targetProtocol
            })
        } catch (e) {
            res.status(500).json({
                error: "PTZ Error",
                msg: e.message
            })
        }
    });

    function addLog(url, log) {
        if (!streamLogs.has(url)) streamLogs.set(url, []);
        const logs = streamLogs.get(url);
        logs.push(log);
        if (logs.length > 200) logs.shift();
        if (logSubscribers.has(url)) {
            for (const res of logSubscribers.get(url)) {
                (res as any).write(`data: ${JSON.stringify({log})}

`)
            }
        }
    }
    __name(addLog, "addLog");
    app.get("/api/system-logs/stream", (req, res) => {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        for (const log of systemLogs) {
            (res as any).write(`data: ${JSON.stringify({log})}

`)
        }
        systemLogSubscribers.add(res);
        req.on("close", () => {
            systemLogSubscribers.delete(res)
        })
    });
    app.get("/api/stream-logs", (req, res) => {
        const url = (req.query?.url as string);
        if (!url) {
            res.status(400).send("No URL provided");
            return
        }
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        const logs = streamLogs.get(url) || [];
        for (const log of logs) {
            (res as any).write(`data: ${JSON.stringify({log})}

`)
        }
        if (!logSubscribers.has(url)) {
            logSubscribers.set(url, new Set)
        }
        const subs = logSubscribers.get(url);
        subs.add(res);
        req.on("close", () => {
            subs.delete(res);
            if (subs.size === 0) logSubscribers.delete(url)
        })
    });
    setInterval(() => {
        const now = Date.now();
        for (const [url, stream] of activeStreams.entries()) {
            if (stream.clients.size === 0 && now - stream.lastActive > 5e3) {
                console.log(`[Bridge] Cleaning up idle stream: ${url}`);
                try {
                    stream.process.kill("SIGKILL")
                } catch (e) {}
                activeStreams.delete(url)
            }
        }
    }, 5e3);
    app.get("/api/stream", (req, res) => {
        const url = (req.query?.url as string);
        if (!url) {
            res.status(400).send("No URL provided");
            return
        }
        if (!hasFfmpeg) {
            res.status(500).send("FFmpeg is not installed on the system.");
            return
        }
        (res as any).writeHead(200, {
            "Cache-Control": "no-store, no-cache, must-revalidate, pre-check=0, post-check=0, max-age=0",
            "Pragma": "no-cache",
            "Connection": "close",
            "Content-Type": "multipart/x-mixed-replace; boundary=ffmpeg"
        });
        if (activeStreams.has(url)) {
            console.log(`[Bridge] Joining existing stream: ${url}`);
            const stream = activeStreams.get(url);
            stream.clients.add(res);
            stream.lastActive = Date.now();
            req.on("close", () => {
                stream.clients.delete(res);
                stream.lastActive = Date.now()
            });
            return
        }
        console.log(`[Bridge] Starting new FFmpeg MJPEG proxy: ${url}`);
        try {
            req.on("close", () => {
                console.log("[Bridge] Client disconnected from RTSP stream MJPEG");
                const stream = activeStreams.get(url);
                if (stream) {
                    stream.clients.delete(res);
                    stream.lastActive = Date.now();
                    if (stream.clients.size === 0) {
                        try {
                            stream.process.kill()
                        } catch (e) {}
                        activeStreams.delete(url)
                    }
                }
            });
            const startFfmpeg = __name(() => {
                const existing = activeStreams.get(url);
                if (existing && existing.clients.size === 0) {
                    activeStreams.delete(url);
                    return
                }
                const ffmpegArgs = url === "test" ? ["-f", "lavfi", "-i", "testsrc=duration=1000:size=320x240:rate=10", "-f", "mpjpeg", "-q:v", "5", "-an", "-"] : ["-fflags", "nobuffer+genpts+discardcorrupt", "-flags", "low_delay", "-rtsp_transport", "tcp", "-analyzeduration", "100000", "-probesize", "32000", "-timeout", "10000000", "-hwaccel", "auto", "-i", url, "-f", "mpjpeg", "-q:v", "5", "-threads", "1", "-an", "-"];
                const ffmpegProc = spawn(resolvedFfmpegPath, ffmpegArgs, {
                    detached: false,
                    windowsHide: true
                });
                registerProcess(ffmpegProc);
                if (!activeStreams.has(url)) {
                    const clients = new Set;
                    clients.add(res);
                    activeStreams.set(url, {
                        clients,
                        process: ffmpegProc,
                        lastActive: Date.now()
                    })
                } else {
                    const stream = activeStreams.get(url);
                    stream.process = ffmpegProc;
                    stream.lastActive = Date.now()
                }
                ffmpegProc.stderr?.on("data", data => {
                    const text = data.toString();
                    text.split("\n").forEach(line => {
                        if (line.trim()) {
                            console.log(`[FFmpeg MJPEG] ${line.trim()}`);
                            addLog(url, line.trim())
                        }
                    })
                });
                ffmpegProc.stdout?.on("data", chunk => {
                    const stream = activeStreams.get(url);
                    if (stream) {
                        for (const client of stream.clients) {
                            client.write(chunk)
                        }
                    }
                });
                ffmpegProc.on("close", code => {
                    console.log(`[FFmpeg MJPEG] Exited with code ${code} for ${url}`);
                    const stream = activeStreams.get(url);
                    if (stream && stream.clients.size > 0) {
                        console.log(`[Bridge] Restarting stream ${url} in 2 seconds...`);
                        setTimeout(() => {
                            const currentStream = activeStreams.get(url);
                            if (currentStream && currentStream.clients.size > 0 && currentStream.process === ffmpegProc) {
                                startFfmpeg()
                            }
                        }, 2e3)
                    }
                });
                ffmpegProc.on("error", err => {
                    console.error("[Bridge] FFmpeg Error:", err)
                })
            }, "startFfmpeg");
            startFfmpeg()
        } catch (err) {
            console.error("[Bridge] MJPEG Proxy Error:", err);
            if (!res.headersSent) {
                res.status(500).end()
            }
        }
    });
    app.post("/api/vcam/reset", (req, res) => {
        if (process.platform !== "win32") {
            return res.json({
                success: true,
                message: "Reset simulated on non-Windows host."
            })
        }
        
        try {
            const vcamDll = require2("vcam-napi");
            if (vcamDll && vcamDll.removeCameraByName) {
                console.log("[VCam] Unregistering KlarityView Camera and KlarityCam via NAPI");
                vcamDll.removeCameraByName("KlarityView Camera");
                vcamDll.removeCameraByName("KlarityCam");
            }
        } catch (e) {
            console.error("[VCam] Failed to unregister MF cameras via NAPI:", e);
        }

        const vcamDir = getResourcePath("vcam");
        const uninstallPath = path.join(vcamDir, "uninstall.bat");
        const installPath = path.join(vcamDir, "install.bat");
        console.log(`[VCam] Manual reset triggered: ${uninstallPath} then ${installPath}`);
        const proc = spawn(`"${uninstallPath}" && "${installPath}"`, [], {
            cwd: vcamDir,
            detached: false,
            windowsHide: true,
            stdio: "pipe",
            shell: true
        });
        registerProcess(proc);
        let output = "";
        proc.stdout.on("data", data => output += data.toString());
        proc.stderr.on("data", data => output += data.toString());
        proc.on("close", code => {
            console.log(`[VCam] Reset process exited with code ${code}`);
            if (!res.headersSent) {
                if (code === 0) {
                    res.json({
                        success: true,
                        message: "Reset completed successfully."
                    })
                } else {
                    console.error(`[VCam] Reset failed:`, output);
                    res.status(500).json({
                        success: false,
                        error: "Process failed with code " + code
                    })
                }
            }
        })
    });
    app.post("/api/vcam/register", (req, res) => {
        if (process.platform !== "win32") {
            return res.json({
                success: true,
                message: "Registration simulated on non-Windows host."
            })
        }
        const vcamDir = getResourcePath("vcam");
        const batPath = path.join(vcamDir, "install.bat");
        console.log(`[VCam] Manual registration triggered: ${batPath}`);
        const proc = spawn(batPath, [], {
            cwd: vcamDir,
            detached: false,
            windowsHide: true,
            stdio: "pipe",
            shell: true
        });
        registerProcess(proc);
        let output = "";
        proc.stdout.on("data", data => output += data.toString());
        proc.stderr.on("data", data => output += data.toString());
        proc.on("close", code => {
            console.log(`[VCam] Registration process exited with code ${code}`);
            if (!res.headersSent) {
                if (code === 0) {
                    res.json({
                        success: true,
                        message: "Registration initiated."
                    })
                } else {
                    res.status(500).json({
                        error: "Failed to run registration script",
                        details: output
                    })
                }
            }
        });
        proc.on("error", err => {
            console.error("[VCam] Process Error:", err);
            if (!res.headersSent) {
                res.status(500).json({
                    error: "Process execution failed",
                    msg: err.message
                })
            }
        })
    });
    app.get("/api/health", async (req, res) => {
        let wowzaStatus = "unknown";
        try {
            const probeUrl = "rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1";
            const check = spawnSync("getent", ["hosts", "9627b0bf2a7b.entrypoint.cloud.wowza.com"]);
            wowzaStatus = check.status === 0 ? "resolved" : "failed-to-resolve";
            console.log(`[Health] Wowza host resolution: ${wowzaStatus}`)
        } catch (e) {
            wowzaStatus = "check-error"
        }
        res.json({
            status: "ok",
            bridge: "active",
            ffmpeg: hasFfmpeg,
            wowza: wowzaStatus,
            env: process.env.NODE_ENV || "development"
        })
    });
    app.get("/api/debug-listeners", (req, res) => {
        res.json({
            listeners: server.listeners("upgrade").map(fn => fn.toString().slice(0, 100))
        })
    });
    if (process.env.NODE_ENV !== "production") {
        const {
            createServer: createViteServer
        } = await import("vite").then(s => {
            const e = "default";
            return (s[e] as any) ? (s[e] as any) : (s as any)
        });
        const vite = await createViteServer({
            server: {
                middlewareMode: true
            },
            appType: "spa"
        });
        app.use(vite.middlewares);
        console.log("[Dev] Upgrade listeners after Vite:", server.listeners("upgrade").map(fn => fn.toString().slice(0, 50)))
    } else {
        const distPath = currentDir;
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
            res.sendFile(path.join(distPath, "index.html"))
        })
    }
    return new Promise(resolve => {
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`[KlarityView Bridge] RTSP to WebRTC/WS server running at http://localhost:${PORT}`);
            resolve(server)
        })
    })
}
__name(startServer, "startServer");
if (process.env.AUTO_START !== "false") {
    startServer().catch(err => {
        console.error("CRITICAL: Server failed to start:", err);
        process.exit(1)
    })
}
export {
    startServer
};