import { useEffect, useRef, useState } from "react";

/** Performance metrics collected by the monitor */
interface PerformanceMetrics {
	/** Current frames per second */
	fps: number;
	/** JavaScript heap memory usage in megabytes */
	memoryUsageMB: number;
	/** Last measured component render time in milliseconds */
	renderTimeMs: number;
}

/**
 * Hook for monitoring application performance metrics in development.
 *
 * Tracks FPS, memory usage, and component render times. Automatically
 * logs warnings for slow renders (>16ms, which would drop below 60fps).
 *
 * @param enabled - Whether to enable monitoring (defaults to DEV mode only)
 * @returns Object containing current metrics and a render time measurement function
 *
 * @example
 * ```tsx
 * const { metrics, measureRenderTime } = usePerformanceMonitor();
 *
 * useEffect(() => {
 *   const endMeasure = measureRenderTime('MyComponent');
 *   return endMeasure;
 * }, []);
 * ```
 */
export function usePerformanceMonitor(enabled: boolean = import.meta.env.DEV) {
	const [metrics, setMetrics] = useState<PerformanceMetrics>({
		fps: 0,
		memoryUsageMB: 0,
		renderTimeMs: 0,
	});

	const frameCount = useRef(0);
	const lastFrameTime = useRef(performance.now());

	useEffect(() => {
		if (!enabled) return;

		let animationFrameId: number;

		const calculateFPS = () => {
			frameCount.current++;
			const currentTime = performance.now();
			const elapsedMs = currentTime - lastFrameTime.current;

			if (elapsedMs >= 1000) {
				const fps = Math.round((frameCount.current * 1000) / elapsedMs);
				frameCount.current = 0;
				lastFrameTime.current = currentTime;

				setMetrics((prev) => ({ ...prev, fps }));
			}

			animationFrameId = requestAnimationFrame(calculateFPS);
		};

		animationFrameId = requestAnimationFrame(calculateFPS);

		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	}, [enabled]);

	useEffect(() => {
		if (!enabled) return;

		const updateMemoryUsage = () => {
			if ("memory" in performance) {
				const memoryInfo = (performance as { memory: { usedJSHeapSize: number } }).memory;
				const usageMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
				setMetrics((prev) => ({ ...prev, memoryUsageMB: usageMB }));
			}
		};

		const intervalId = setInterval(updateMemoryUsage, 2000);
		return () => clearInterval(intervalId);
	}, [enabled]);

	const measureRenderTime = (componentName: string): (() => void) => {
		if (!enabled) return () => {};

		const startTime = performance.now();

		return () => {
			const renderTimeMs = performance.now() - startTime;
			setMetrics((prev) => ({ ...prev, renderTimeMs }));

			if (import.meta.env.DEV && renderTimeMs > 16) {
				console.warn(
					`[Performance] ${componentName} slow render: ${renderTimeMs.toFixed(2)}ms`,
				);
			}
		};
	};

	return {
		metrics,
		measureRenderTime,
	};
}
