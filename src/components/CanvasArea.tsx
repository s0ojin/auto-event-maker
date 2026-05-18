import React, { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
import type { Hotspot } from "../types";

interface CanvasAreaProps {
	imageUrl: string;
	hotspots: Hotspot[];
	setHotspots: React.Dispatch<React.SetStateAction<Hotspot[]>>;
	selectedId: string | null;
	setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ imageUrl, hotspots, setHotspots, selectedId, setSelectedId }) => {
	const [image] = useImage(imageUrl);
	const containerRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<Konva.Stage>(null);
	const trRef = useRef<Konva.Transformer>(null);

	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	
	// Stage Transform State
	const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
	const [scale, setScale] = useState(1);
	
	const [isDrawing, setIsDrawing] = useState(false);
	const [newRect, setNewRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
	
	// Tool state
	const [isSpaceDown, setIsSpaceDown] = useState(false);

	// Key bindings for panning (Spacebar)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space" && e.target === document.body) {
				e.preventDefault();
				setIsSpaceDown(true);
			}
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				setIsSpaceDown(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	const handleResetView = useCallback(() => {
		if (containerRef.current && image) {
			const containerWidth = containerRef.current.clientWidth;
			const containerHeight = containerRef.current.clientHeight;
			
			const scaleX = (containerWidth - 60) / image.width;
			const scaleY = (containerHeight - 60) / image.height;
			const fitScale = Math.min(scaleX, Math.min(scaleY, 1));
			
			setScale(fitScale);
			setStagePos({
				x: (containerWidth - image.width * fitScale) / 2,
				y: (containerHeight - image.height * fitScale) / 2
			});
		}
	}, [image]);

	const handleZoom = useCallback((factor: number) => {
		const stage = stageRef.current;
		if (!stage) return;

		const oldScale = scale;
		const center = {
			x: stage.width() / 2,
			y: stage.height() / 2,
		};

		const mousePointTo = {
			x: (center.x - stage.x()) / oldScale,
			y: (center.y - stage.y()) / oldScale,
		};

		const newScale = oldScale * factor;
		
		// Min/Max zoom constraints
		if (newScale < 0.05 || newScale > 10) return;

		setScale(newScale);
		setStagePos({
			x: center.x - mousePointTo.x * newScale,
			y: center.y - mousePointTo.y * newScale,
		});
	}, [scale]);

	// Initial Fit
	useEffect(() => {
		const updateSize = () => {
			if (containerRef.current && image) {
				const containerWidth = containerRef.current.clientWidth;
				const containerHeight = containerRef.current.clientHeight;
				setDimensions({ width: containerWidth, height: containerHeight });

				// If it's the first time the image loads, center and fit it
				if (scale === 1 && stagePos.x === 0 && stagePos.y === 0) {
					handleResetView();
				}
			}
		};

		updateSize();
		window.addEventListener("resize", updateSize);
		return () => window.removeEventListener("resize", updateSize);
	}, [image, containerRef.current?.clientWidth, containerRef.current?.clientHeight, scale, stagePos.x, stagePos.y, handleResetView]);

	// Handle Transformer attachments
	useEffect(() => {
		if (selectedId && trRef.current && stageRef.current) {
			const node = stageRef.current.findOne(`#${selectedId}`);
			if (node) {
				trRef.current.nodes([node]);
				trRef.current.getLayer()?.batchDraw();
			}
		} else if (trRef.current) {
			trRef.current.nodes([]);
		}
	}, [selectedId, hotspots]);

	const getRelativePointerPosition = (stage: Konva.Stage) => {
		const pointerPosition = stage.getPointerPosition();
		if (!pointerPosition) return { x: 0, y: 0 };
		return {
			x: (pointerPosition.x - stage.x()) / stage.scaleX(),
			y: (pointerPosition.y - stage.y()) / stage.scaleY(),
		};
	};

	const handleWheel = useCallback((e: any) => {
		e.evt.preventDefault();
		const stage = e.target.getStage();
		
		if (e.evt.ctrlKey) {
			// Zooming
			const scaleBy = 1.05;
			const oldScale = stage.scaleX();
			const pointer = stage.getPointerPosition();
			
			if (!pointer) return;
			
			const mousePointTo = {
				x: (pointer.x - stage.x()) / oldScale,
				y: (pointer.y - stage.y()) / oldScale,
			};

			const direction = e.evt.deltaY > 0 ? -1 : 1;
			const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
			
			// Min/Max zoom constraints
			if (newScale < 0.05 || newScale > 10) return;

			setScale(newScale);
			setStagePos({
				x: pointer.x - mousePointTo.x * newScale,
				y: pointer.y - mousePointTo.y * newScale,
			});
		} else {
			// Panning
			setStagePos(prev => ({
				x: prev.x - (e.evt.deltaX || 0),
				y: prev.y - (e.evt.deltaY || 0),
			}));
		}
	}, []);

	const handleMouseDown = (e: any) => {
		// Prevent drawing if we are panning with space or middle click
		if (isSpaceDown || e.evt.button === 1 || e.evt.button === 2) return;

		const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === "backgroundImage";
		if (clickedOnEmpty) {
			setSelectedId(null);
			const stage = e.target.getStage();
			const pos = getRelativePointerPosition(stage);

			setIsDrawing(true);
			setNewRect({
				x: pos.x,
				y: pos.y,
				width: 0,
				height: 0,
			});
		}
	};

	const handleMouseMove = (e: any) => {
		if (!isDrawing || !newRect) return;

		const stage = e.target.getStage();
		const pos = getRelativePointerPosition(stage);

		setNewRect({
			x: newRect.x,
			y: newRect.y,
			width: pos.x - newRect.x,
			height: pos.y - newRect.y,
		});
	};

	const handleMouseUp = () => {
		if (isDrawing && newRect) {
			setIsDrawing(false);

			// Normalize rect coordinates
			let normX = newRect.x;
			let normY = newRect.y;
			let normWidth = newRect.width;
			let normHeight = newRect.height;
			if (normWidth < 0) {
				normX += normWidth;
				normWidth = Math.abs(normWidth);
			}
			if (normHeight < 0) {
				normY += normHeight;
				normHeight = Math.abs(normHeight);
			}

			if (normWidth > 5 && normHeight > 5) {
				const newHotspot: Hotspot = {
					id: `rect_${Math.random().toString(36).substring(2, 9)}`,
					x: normX,
					y: normY,
					width: normWidth,
					height: normHeight,
					href: "https://",
					target: "_blank",
					title: "Button",
				};
				setHotspots([...hotspots, newHotspot]);
				setSelectedId(newHotspot.id);
			}
			setNewRect(null);
		}
	};

	if (!image) {
		return <div className="canvas-placeholder">Loading image...</div>;
	}

	return (
		<div className="canvas-container" ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }}>
			{/* HUD */}
			<div style={{ position: "absolute", top: 12, left: 12, right: 12, zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "start" }}>
				<div style={{ background: "rgba(0,0,0,0.6)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", color: "white", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.1)" }}>
					Zoom: {Math.round(scale * 100)}% | Space+Drag to Pan | Ctrl+Scroll to Zoom
				</div>
				
				<div style={{ display: "flex", gap: "8px" }}>
					<div style={{ 
						background: "rgba(0,0,0,0.6)", 
						display: "flex", 
						borderRadius: "20px", 
						backdropFilter: "blur(4px)", 
						border: "1px solid rgba(255,255,255,0.1)",
						overflow: "hidden"
					}}>
						<button 
							onClick={() => handleZoom(1.2)}
							title="Zoom In"
							style={{ 
								background: "transparent", 
								color: "white", 
								border: "none", 
								padding: "6px 10px", 
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								borderRight: "1px solid rgba(255,255,255,0.1)"
							}}
							onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
							onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
						</button>
						<button 
							onClick={() => handleZoom(0.8)}
							title="Zoom Out"
							style={{ 
								background: "transparent", 
								color: "white", 
								border: "none", 
								padding: "6px 10px", 
								cursor: "pointer",
								display: "flex",
								alignItems: "center"
							}}
							onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")}
							onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
						</button>
					</div>

					<button 
						onClick={handleResetView}
						style={{ 
							background: "var(--accent-color)", 
							color: "white", 
							border: "none", 
							padding: "6px 12px", 
							borderRadius: "20px", 
							fontSize: "0.8rem", 
							fontWeight: 600, 
							cursor: "pointer", 
							boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
							display: "flex",
							alignItems: "center",
							gap: "6px"
						}}
					>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
						Reset
					</button>
				</div>
			</div>

			<Stage
				width={dimensions.width}
				height={dimensions.height}
				x={stagePos.x}
				y={stagePos.y}
				scaleX={scale}
				scaleY={scale}
				draggable={isSpaceDown}
				onDragEnd={(e) => {
					if (e.target === e.target.getStage()) {
						setStagePos({ x: e.target.x(), y: e.target.y() });
					}
				}}
				onWheel={handleWheel}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onTouchStart={handleMouseDown}
				onTouchMove={handleMouseMove}
				onTouchEnd={handleMouseUp}
				ref={stageRef}
				style={{ cursor: isSpaceDown ? "grab" : "crosshair" }}
			>
				<Layer>
					<KonvaImage image={image} name="backgroundImage" />

					{hotspots.map((rect) => (
						<Rect
							key={rect.id}
							id={rect.id}
							x={rect.x}
							y={rect.y}
							width={rect.width}
							height={rect.height}
							fill="rgba(59, 130, 246, 0.4)"
							stroke={selectedId === rect.id ? "#2563eb" : "#93c5fd"}
							strokeWidth={selectedId === rect.id ? 2 / scale : 1 / scale}
							draggable={!isSpaceDown}
							onDragMove={(e) => {
								if (e.target.id() === rect.id) {
									// keep visually within bounds optionally
								}
							}}
							onDragEnd={(e) => {
								if (e.target.id() === rect.id) {
									const newHotspots = hotspots.map((h) => {
										if (h.id === rect.id) {
											return { ...h, x: e.target.x(), y: e.target.y() };
										}
										return h;
									});
									setHotspots(newHotspots);
								}
							}}
							onTransformEnd={() => {
								const node = stageRef.current?.findOne(`#${rect.id}`);
								if (node) {
									const scaleX = node.scaleX();
									const scaleY = node.scaleY();
									node.scaleX(1);
									node.scaleY(1);
									const newHotspots = hotspots.map((h) => {
										if (h.id === rect.id) {
											return {
												...h,
												x: node.x(),
												y: node.y(),
												width: Math.max(5, node.width() * scaleX),
												height: Math.max(5, node.height() * scaleY),
											};
										}
										return h;
									});
									setHotspots(newHotspots);
								}
							}}
							onClick={(e) => {
								if (!isSpaceDown) {
									e.cancelBubble = true;
									setSelectedId(rect.id);
								}
							}}
							onTap={(e) => {
								if (!isSpaceDown) {
									e.cancelBubble = true;
									setSelectedId(rect.id);
								}
							}}
						/>
					))}

					{isDrawing && newRect && (
						<Rect
							x={newRect.width < 0 ? newRect.x + newRect.width : newRect.x}
							y={newRect.height < 0 ? newRect.y + newRect.height : newRect.y}
							width={Math.abs(newRect.width)}
							height={Math.abs(newRect.height)}
							fill="rgba(59, 130, 246, 0.2)"
							stroke="#2563eb"
							strokeWidth={1 / scale}
						/>
					)}

					<Transformer
						ref={trRef}
						boundBoxFunc={(oldBox, newBox) => {
							if (newBox.width < 5 || newBox.height < 5) return oldBox;
							return newBox;
						}}
						ignoreStroke={true}
					/>
				</Layer>
			</Stage>
		</div>
	);
};

export default CanvasArea;
