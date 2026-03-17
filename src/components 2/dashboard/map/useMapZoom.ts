"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Types ─── */

export type ZoomTransform = {
    scale: number;
    translateX: number;
    translateY: number;
};

type UseMapZoomOptions = {
    minScale?: number;
    maxScale?: number;
    zoomStep?: number;
    animationDurationMs?: number;
};

type UseMapZoomReturn = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    svgGroupRef: React.RefObject<SVGGElement | null>;
    transform: ZoomTransform;
    scale: number;
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
    fitBounds: (bbox: { x: number; y: number; width: number; height: number }, padding?: number) => void;
    fitToElement: (element: SVGGraphicsElement, padding?: number) => void;
};

const IDENTITY: ZoomTransform = { scale: 1, translateX: 0, translateY: 0 };

/* ─── Hook ─── */

export function useMapZoom(options: UseMapZoomOptions = {}): UseMapZoomReturn {
    const {
        minScale = 1,
        maxScale = 8,
        zoomStep = 0.15,
        animationDurationMs = 280,
    } = options;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const svgGroupRef = useRef<SVGGElement | null>(null);

    // Use refs for hot-path transform to avoid re-renders per frame
    const transformRef = useRef<ZoomTransform>({ ...IDENTITY });
    const [transform, setTransform] = useState<ZoomTransform>({ ...IDENTITY });
    const animFrameRef = useRef<number>(0);
    const animatingRef = useRef(false);

    // Pointer tracking for pan (drag)
    const isDragging = useRef(false);
    const lastPointer = useRef({ x: 0, y: 0 });

    // Multi-touch tracking for pinch zoom
    const touchCache = useRef<PointerEvent[]>([]);
    const prevPinchDist = useRef<number | null>(null);

    /* ── Apply transform to DOM ── */
    const applyTransform = useCallback((t: ZoomTransform) => {
        transformRef.current = t;
        if (svgGroupRef.current) {
            svgGroupRef.current.style.transform = `translate(${t.translateX}px, ${t.translateY}px) scale(${t.scale})`;
            svgGroupRef.current.style.transformOrigin = "0 0";
        }
    }, []);

    const commitTransform = useCallback((t: ZoomTransform) => {
        applyTransform(t);
        setTransform({ ...t });
    }, [applyTransform]);

    /* ── Clamp scale ── */
    const clampScale = useCallback(
        (s: number) => Math.min(maxScale, Math.max(minScale, s)),
        [minScale, maxScale],
    );

    /* ── Get SVG point from client coords ── */
    const getSvgPoint = useCallback((clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) return { x: 0, y: 0 };
        const rect = container.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top,
        };
    }, []);

    /* ── Zoom around a point (in container coords) ── */
    const zoomAroundPoint = useCallback(
        (pointX: number, pointY: number, newScale: number) => {
            const t = transformRef.current;
            const clamped = clampScale(newScale);
            const ratio = clamped / t.scale;

            // Transform so the point stays fixed:
            // new_translate = point - ratio * (point - old_translate)
            const nextTx = pointX - ratio * (pointX - t.translateX);
            const nextTy = pointY - ratio * (pointY - t.translateY);

            commitTransform({
                scale: clamped,
                translateX: nextTx,
                translateY: nextTy,
            });
        },
        [clampScale, commitTransform],
    );

    /* ── Smooth animated transition ── */
    const animateTo = useCallback(
        (target: ZoomTransform) => {
            if (animatingRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
            animatingRef.current = true;
            const start = { ...transformRef.current };
            const startTime = performance.now();
            const duration = animationDurationMs;

            const tick = (now: number) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                // Ease-out cubic
                const ease = 1 - Math.pow(1 - progress, 3);

                const current: ZoomTransform = {
                    scale: start.scale + (target.scale - start.scale) * ease,
                    translateX: start.translateX + (target.translateX - start.translateX) * ease,
                    translateY: start.translateY + (target.translateY - start.translateY) * ease,
                };

                applyTransform(current);

                if (progress < 1) {
                    animFrameRef.current = requestAnimationFrame(tick);
                } else {
                    animatingRef.current = false;
                    commitTransform(target);
                }
            };

            animFrameRef.current = requestAnimationFrame(tick);
        },
        [animationDurationMs, applyTransform, commitTransform],
    );

    /* ── Public API ── */

    const zoomIn = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const t = transformRef.current;
        zoomAroundPoint(cx, cy, t.scale * (1 + zoomStep));
    }, [zoomStep, zoomAroundPoint]);

    const zoomOut = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const t = transformRef.current;
        zoomAroundPoint(cx, cy, t.scale * (1 - zoomStep));
    }, [zoomStep, zoomAroundPoint]);

    const resetView = useCallback(() => {
        animateTo({ ...IDENTITY });
    }, [animateTo]);

    const fitBounds = useCallback(
        (bbox: { x: number; y: number; width: number; height: number }, padding = 0.15) => {
            const container = containerRef.current;
            const svg = container?.querySelector("svg");
            if (!container || !svg) return;

            const containerRect = container.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();
            const currentT = transformRef.current;

            // Convert bbox (SVG user units) to container pixels at current scale
            // First figure out the SVG → container pixel ratio at scale=1
            const viewBox = svg.viewBox.baseVal;
            const svgPixelsPerUnit = svgRect.width / (currentT.scale * viewBox.width);

            // Target bbox in container pixels at scale=1
            const bboxPxX = bbox.x * svgPixelsPerUnit;
            const bboxPxY = bbox.y * svgPixelsPerUnit;
            const bboxPxW = bbox.width * svgPixelsPerUnit;
            const bboxPxH = bbox.height * svgPixelsPerUnit;

            const padX = bboxPxW * padding;
            const padY = bboxPxH * padding;

            const fitW = bboxPxW + padX * 2;
            const fitH = bboxPxH + padY * 2;

            const scaleX = containerRect.width / fitW;
            const scaleY = containerRect.height / fitH;
            const targetScale = clampScale(Math.min(scaleX, scaleY));

            // Center the bbox
            const targetTx = containerRect.width / 2 - (bboxPxX + bboxPxW / 2) * targetScale;
            const targetTy = containerRect.height / 2 - (bboxPxY + bboxPxH / 2) * targetScale;

            animateTo({
                scale: targetScale,
                translateX: targetTx,
                translateY: targetTy,
            });
        },
        [animateTo, clampScale],
    );

    const fitToElement = useCallback(
        (element: SVGGraphicsElement, padding = 0.15) => {
            const bbox = element.getBBox();
            fitBounds(bbox, padding);
        },
        [fitBounds],
    );

    /* ── Event handlers ── */

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Wheel zoom (desktop scroll + trackpad pinch via ctrlKey)
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const point = getSvgPoint(e.clientX, e.clientY);
            const t = transformRef.current;

            // ctrlKey indicates pinch-to-zoom on trackpad
            const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.003;
            const newScale = clampScale(t.scale * (1 + delta));
            zoomAroundPoint(point.x, point.y, newScale);
        };

        // Double-click zoom
        const handleDblClick = (e: MouseEvent) => {
            e.preventDefault();
            const point = getSvgPoint(e.clientX, e.clientY);
            const t = transformRef.current;
            const factor = e.shiftKey ? 0.5 : 2;
            const target = clampScale(t.scale * factor);
            zoomAroundPoint(point.x, point.y, target);
        };

        // Pointer events for pan + pinch
        const handlePointerDown = (e: PointerEvent) => {
            // Only track primary button (mouse) or touch
            if (e.pointerType === "mouse" && e.button !== 0) return;

            touchCache.current.push(e);
            container.setPointerCapture(e.pointerId);

            if (touchCache.current.length === 1) {
                isDragging.current = true;
                lastPointer.current = { x: e.clientX, y: e.clientY };
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            // Update touch cache
            const idx = touchCache.current.findIndex((p) => p.pointerId === e.pointerId);
            if (idx >= 0) {
                touchCache.current[idx] = e;
            }

            // Two-finger pinch zoom
            if (touchCache.current.length === 2) {
                const [t1, t2] = touchCache.current;
                if (!t1 || !t2) return;
                const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

                if (prevPinchDist.current !== null) {
                    const midX = (t1.clientX + t2.clientX) / 2;
                    const midY = (t1.clientY + t2.clientY) / 2;
                    const point = getSvgPoint(midX, midY);
                    const ratio = dist / prevPinchDist.current;
                    const t = transformRef.current;
                    zoomAroundPoint(point.x, point.y, t.scale * ratio);
                }

                prevPinchDist.current = dist;
                isDragging.current = false;
                return;
            }

            // Single-finger drag pan
            if (isDragging.current && touchCache.current.length === 1) {
                const dx = e.clientX - lastPointer.current.x;
                const dy = e.clientY - lastPointer.current.y;
                lastPointer.current = { x: e.clientX, y: e.clientY };

                const t = transformRef.current;
                commitTransform({
                    ...t,
                    translateX: t.translateX + dx,
                    translateY: t.translateY + dy,
                });
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            touchCache.current = touchCache.current.filter((p) => p.pointerId !== e.pointerId);

            if (touchCache.current.length < 2) {
                prevPinchDist.current = null;
            }

            if (touchCache.current.length === 0) {
                isDragging.current = false;
            }
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("dblclick", handleDblClick);
        container.addEventListener("pointerdown", handlePointerDown);
        container.addEventListener("pointermove", handlePointerMove);
        container.addEventListener("pointerup", handlePointerUp);
        container.addEventListener("pointercancel", handlePointerUp);

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("dblclick", handleDblClick);
            container.removeEventListener("pointerdown", handlePointerDown);
            container.removeEventListener("pointermove", handlePointerMove);
            container.removeEventListener("pointerup", handlePointerUp);
            container.removeEventListener("pointercancel", handlePointerUp);
            if (animFrameRef.current) {
                cancelAnimationFrame(animFrameRef.current);
            }
        };
    }, [clampScale, commitTransform, getSvgPoint, zoomAroundPoint]);

    return {
        containerRef,
        svgGroupRef,
        transform,
        scale: transform.scale,
        zoomIn,
        zoomOut,
        resetView,
        fitBounds,
        fitToElement,
    };
}
