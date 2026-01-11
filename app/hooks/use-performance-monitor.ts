import { useEffect, useRef, useState } from "react";

interface PerformanceMetrics {
	fps: number;
	memoryUsage: number;
	renderTime: number;
}

/**
 * Simple performance monitoring hook for development
 */
export function usePerformanceMonitor(enabled: boolean = import.meta.env.DEV) {
	const [metrics, setMetrics] = useState<PerformanceMetrics>({
		fps: 0,
		memoryUsage: 0,
		renderTime: 0,
	});

	const frameCountRef = useRef(0);
	const lastTimeRef = useRef(performance.now());

	useEffect(() => {
		if (!enabled) return;

		const updateFPS = () => {
			frameCountRef.current++;
			const now = performance.now();
			const delta = now - lastTimeRef.current;

			if (delta >= 1000) {
				const fps = Math.round((frameCountRef.current * 1000) / delta);
				frameCountRef.current = 0;
				lastTimeRef.current = now;

				setMetrics((prev) => ({ ...prev, fps }));
			}

			requestAnimationFrame(updateFPS);
		};

		requestAnimationFrame(updateFPS);
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;

		const updateMemory = () => {
			if ("memory" in performance) {
				const memory = (performance as any).memory;
				const memoryUsageMB = memory.usedJSHeapSize / 1024 / 1024;
				setMetrics((prev) => ({ ...prev, memoryUsage: memoryUsageMB }));
			}
		};

		const interval = setInterval(updateMemory, 2000);
		return () => clearInterval(interval);
	}, [enabled]);

	const measureRenderTime = (componentName: string) => {
		if (!enabled) return () => {};

		const startTime = performance.now();

		return () => {
			const renderTime = performance.now() - startTime;
			setMetrics((prev) => ({ ...prev, renderTime }));

			if (import.meta.env.DEV && renderTime > 16) {
				// Log slow renders
				console.warn(
					`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`,
				);
			}
		};
	};

	return {
		metrics,
		measureRenderTime,
	};
}
