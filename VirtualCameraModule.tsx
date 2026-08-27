import React, { useEffect } from 'react';
import { useStore } from '../store';

let connectionFailedToastShown = false;

export function VirtualCameraModule() {
  const virtualCameraEnabled = useStore(state => state.virtualCameraEnabled);
  const setVirtualCameraEnabled = useStore(state => state.setVirtualCameraEnabled);
  const privacyMode = useStore(state => state.privacyMode);
  const addToast = useStore(state => state.addToast);

  useEffect(() => {
    if (!virtualCameraEnabled) return;

    let ws: WebSocket | null = null;
    let isConnected = false;
    let intervalId: NodeJS.Timeout | null = null;
    let requestFrameId: number | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isSending = false;
    let frameCount = 0;

    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
    }

    let lastLayoutTime = 0;
    let cachedRect: DOMRect | null = null;
    let cachedSources: Array<{ el: HTMLElement; cRect: DOMRect; clipRect: { left: number; top: number; right: number; bottom: number }; isHidden: boolean }> = [];

    const getWebSocketUrls = () => {
        const urls: string[] = [];
        try {
            const currentUrl = new URL(window.location.href);
            const protocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = currentUrl.host;
            if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
                urls.push(`${protocol}//${host}/api/virtual-camera`);
            } else {
                urls.push(`ws://${host}/api/virtual-camera`);
            }
        } catch (e) {}

        if (urls.length === 0) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            urls.push(`${protocol}//${window.location.host}/api/virtual-camera`);
        }
        return urls;
    };

    const urls = getWebSocketUrls();
    let urlIndex = 0;

    const connectWs = () => {
        if (!virtualCameraEnabled) return;
        const wsUrl = urls[urlIndex % urls.length];
        urlIndex++;
        console.log("[VirtualCamera] Connecting to WebSocket:", wsUrl);

        try {
            ws = new WebSocket(wsUrl);
            ws.binaryType = 'arraybuffer';

            ws.onopen = () => {
                console.log("[VirtualCamera] Connected to server successfully via", wsUrl);
                isConnected = true;
                addToast("Virtual Camera Active & Connected", "success");
            };

            ws.onmessage = () => {};

            ws.onerror = (err) => {
                console.warn("[VirtualCamera] WS connection failed to", wsUrl, "- this is expected if third-party cookies are blocked in the iframe preview.");
                if (!connectionFailedToastShown && window.location.host.includes('run.app')) {
                    connectionFailedToastShown = true;
                    // Check if we are in an iframe
                    if (window.self !== window.top) {
                        addToast("Virtual Camera connection failed. Try opening the app in a new tab to bypass iframe restrictions.", "error");
                    }
                }
            };

            ws.onclose = () => {
                console.warn("[VirtualCamera] WS closed on", wsUrl);
                isConnected = false;
                if (virtualCameraEnabled) {
                    reconnectTimeout = setTimeout(connectWs, 2000);
                }
            };
        } catch (e) {
            console.error("[VirtualCamera] Connection exception:", e);
            if (virtualCameraEnabled) {
                reconnectTimeout = setTimeout(connectWs, 3000);
            }
        }
    };

    connectWs();

    // Render & Broadcast Loop (30 FPS)
    
    let lastDrawTime = 0;
    const loop = () => {
        if (!virtualCameraEnabled) return;
        
        // Use setTimeout instead of requestAnimationFrame to prevent throttling when minimized
        // The main process has backgroundThrottling: false, so setTimeout will run reliably
        intervalId = setTimeout(loop, 33);
        
        const timestamp = performance.now();
        // Target 30 FPS (~33ms per frame)
        if (timestamp - lastDrawTime < 32) return;
        
        if (!isConnected || !ws || ws.readyState !== 1 || isSending) return;
        if (ws.bufferedAmount > 2000000) return; // Allow up to 2MB buffer to prevent dropping frames on tiny network spikes

        const state = useStore.getState();
        const activeView = state.activeView;
        const currentPrivacyMode = state.privacyMode;
        const showPrivacy = currentPrivacyMode || activeView !== 'procedure';

        if (!ctx) return;

        isSending = true;
        try {
            lastDrawTime = timestamp;
            frameCount++;
            // Draw background
            ctx.fillStyle = '#0b0f19';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (showPrivacy) {
                const now = Date.now();
                const w = canvas.width;
                const h = canvas.height;
                
                // Deep medical blue background
                ctx.fillStyle = '#020617';
                ctx.fillRect(0, 0, w, h);
                
                // Tech Grid
                ctx.strokeStyle = 'rgba(30, 58, 138, 0.3)';
                ctx.lineWidth = 1;
                const gridSize = 60;
                const offset = (now / 50) % gridSize;
                ctx.beginPath();
                for (let x = offset; x < w; x += gridSize) {
                    ctx.moveTo(x, 0); ctx.lineTo(x, h);
                }
                for (let y = offset; y < h; y += gridSize) {
                    ctx.moveTo(0, y); ctx.lineTo(w, y);
                }
                ctx.stroke();

                // Shield Icon
                ctx.fillStyle = '#3b82f6';
                ctx.font = '80px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🛡️', w / 2, h / 2 - 40);

                ctx.fillStyle = '#93c5fd';
                ctx.font = 'bold 32px sans-serif';
                ctx.fillText(currentPrivacyMode ? 'PRIVACY MODE ENABLED' : 'SYSTEM STANDBY', w / 2, h / 2 + 40);
                
                ctx.fillStyle = '#60a5fa';
                ctx.font = '20px sans-serif';
                ctx.fillText('Broadcast Paused', w / 2, h / 2 + 80);

                // Scanning line
                const scanY = (now / 15) % h;
                const gradient = ctx.createLinearGradient(0, scanY - 50, 0, scanY);
                gradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
                gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, scanY - 50, w, 50);
                ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
                ctx.fillRect(0, scanY, w, 2);

            } else {
                let renderedSourcesCount = 0;
                
                if (timestamp - lastLayoutTime > 500) {
                    const programContainer = document.getElementById('program-output-container');
                    if (programContainer) {
                        cachedRect = programContainer.getBoundingClientRect();
                        cachedSources = Array.from(programContainer.querySelectorAll('video, canvas')).map(el => ({
                            el: el as HTMLElement,
                            cRect: el.getBoundingClientRect(),
                            clipRect: { left: 0, top: 0, right: 0, bottom: 0 },
                            isHidden: false
                        }));
                    } else {
                        cachedRect = null;
                        cachedSources = [];
                    }
                    lastLayoutTime = timestamp;
                }
                
                if (cachedRect && cachedSources.length > 0) {
                    const pRect = cachedRect;
                    
                    cachedSources.forEach(source => {
                        const { el, cRect: rect } = source;
                        
                        // Ignore elements with 0 width/height
                        if (rect.width === 0 || rect.height === 0 || pRect.width === 0 || pRect.height === 0) return;
                        
                        // Calculate relative position and scale
                        const scaleX = canvas.width / pRect.width;
                        const scaleY = canvas.height / pRect.height;
                        
                        const relX = (rect.left - pRect.left) * scaleX;
                        const relY = (rect.top - pRect.top) * scaleY;
                        const relW = rect.width * scaleX;
                        const relH = rect.height * scaleY;
                        
                        if (el.tagName.toLowerCase() === 'video') {
                            const v = el as HTMLVideoElement;
                            if (v.readyState >= 2) {
                                const videoRatio = (v.videoWidth && v.videoHeight) ? (v.videoWidth / v.videoHeight) : (16 / 9);
                                const rectRatio = relW / relH;
                                
                                let renderWidth = relW;
                                let renderHeight = relH;
                                let offsetX = 0;
                                let offsetY = 0;
                                
                                const isCover = v.classList.contains('object-cover') || v.style.objectFit === 'cover';
                                const isContain = v.classList.contains('object-contain') || v.style.objectFit === 'contain' || (!isCover && !v.classList.contains('object-fill') && v.style.objectFit !== 'fill');
                                
                                if (isCover) {
                                   if (rectRatio > videoRatio) {
                                       renderWidth = relW;
                                       renderHeight = relW / videoRatio;
                                       offsetY = (relH - renderHeight) / 2;
                                   } else {
                                       renderHeight = relH;
                                       renderWidth = relH * videoRatio;
                                       offsetX = (relW - renderWidth) / 2;
                                   }
                                } else if (isContain) {
                                   if (rectRatio > videoRatio) {
                                       renderHeight = relH;
                                       renderWidth = relH * videoRatio;
                                       offsetX = (relW - renderWidth) / 2;
                                   } else {
                                       renderWidth = relW;
                                       renderHeight = relW / videoRatio;
                                       offsetY = (relH - renderHeight) / 2;
                                   }
                                }
                                
                                try {
                                    ctx.save();
                                    ctx.beginPath();
                                    ctx.rect(relX, relY, relW, relH);
                                    ctx.clip();
                                    ctx.drawImage(v, relX + offsetX, relY + offsetY, renderWidth, renderHeight);
                                    ctx.restore();
                                } catch(e) {}
                                renderedSourcesCount++;
                            }
                        } else if (el.tagName.toLowerCase() === 'canvas') {
                            try {
                                ctx.save();
                                ctx.beginPath();
                                ctx.rect(relX, relY, relW, relH);
                                ctx.clip();
                                ctx.drawImage(el as HTMLCanvasElement, relX, relY, relW, relH);
                                ctx.restore();
                                renderedSourcesCount++;
                            } catch(e) {}
                        }
                    });
                }
                
                if (renderedSourcesCount === 0) {
                    const fallbackVideo = document.querySelector('video');
                    if (fallbackVideo && fallbackVideo.readyState >= 2) {
                        ctx.drawImage(fallbackVideo, 0, 0, canvas.width, canvas.height);
                    }
                }
            }

            // ENCODE AS JPEG TO PREVENT CPU/NETWORK OVERLOAD
            canvas.toBlob((blob) => {
                if (ws && ws.readyState === 1 && blob) {
                    if (ws.bufferedAmount < 5000000) { // Safety check to prevent absolute freeze if socket hangs
                        ws.send(blob);
                    }
                }
                isSending = false;
            }, 'image/jpeg', 0.65); // 65% quality, dramatically reduces size to prevent freezing
        } catch (e) {
            isSending = false;
        }
    };
    
    // Start loop immediately
    intervalId = setTimeout(loop, 0);


    return () => {
        if (intervalId) clearTimeout(intervalId);
        if (requestFrameId) cancelAnimationFrame(requestFrameId);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        if (ws) {
            ws.close();
        }
    };
  }, [virtualCameraEnabled, addToast]);

  return null;
}
