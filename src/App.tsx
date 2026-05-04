import React, { useState, useCallback, useEffect } from "react";
import CanvasArea from "./components/CanvasArea";
import PropertiesPanel from "./components/PropertiesPanel";
import CodeGenerator from "./components/CodeGenerator";
import type { Hotspot } from "./types";
import "./App.css";

function App() {
	const [imageConfig, setImageConfig] = useState<{ url: string; width: number; height: number } | null>(null);
	const [hotspots, setHotspots] = useState<Hotspot[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [dragCounter, setDragCounter] = useState(0);
	const isDragging = dragCounter > 0;

	// Prevent browser from opening dragged files globally
	useEffect(() => {
		const preventDefault = (e: Event) => e.preventDefault();
		window.addEventListener("dragover", preventDefault);
		window.addEventListener("drop", preventDefault);
		return () => {
			window.removeEventListener("dragover", preventDefault);
			window.removeEventListener("drop", preventDefault);
		};
	}, []);

	const processFile = (file: File) => {
		if (file && file.type.startsWith("image/")) {
			const objectUrl = URL.createObjectURL(file);
			const img = new Image();
			img.src = objectUrl;
			img.onload = () => {
				setImageConfig({
					url: objectUrl,
					width: img.naturalWidth,
					height: img.naturalHeight,
				});
				setHotspots([]);
				setSelectedId(null);
			};
		}
	};

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) processFile(file);
	};

	const onDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragCounter(prev => prev + 1);
	}, []);

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragCounter(prev => prev - 1);
	}, []);

	const onDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragCounter(0);
		const file = e.dataTransfer.files?.[0];
		if (file) processFile(file);
	}, []);

	const updateHotspot = (updated: Hotspot) => {
		setHotspots(hotspots.map((h) => (h.id === updated.id ? updated : h)));
	};

	const deleteHotspot = (id: string) => {
		setHotspots(hotspots.filter((h) => h.id !== id));
		if (selectedId === id) setSelectedId(null);
	};

	return (
		<div className="layout-container" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
			{isDragging && (
				<div className="drag-overlay">
					<h2>Drop image here to start</h2>
				</div>
			)}
			<header className="header">
				<div className="logo-group">
					<h1>Auto Event Maker</h1>
					<span className="badge">Internal Tool</span>
				</div>
				<p className="subtitle">Drag & Drop an image anywhere, draw button areas, and perfectly generate HTML/CSS.</p>
			</header>

			<main className="main-content">
				<section className="canvas-section">
					<div className="upload-bar">
						{!imageConfig && (
							<label className="btn-upload">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
								Upload Image Manually
								<input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleImageUpload} hidden />
							</label>
						)}
						{imageConfig && (
							<span className="image-info">
								{imageConfig.width} x {imageConfig.height}px
								<label className="btn-upload-small">
									Change Image
									<input type="file" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleImageUpload} hidden />
								</label>
							</span>
						)}
					</div>
					<div className="canvas-wrapper">
						{imageConfig ? (
							<CanvasArea
								imageUrl={imageConfig.url}
								hotspots={hotspots}
								setHotspots={setHotspots}
								selectedId={selectedId}
								setSelectedId={setSelectedId}
							/>
						) : (
							<div className="upload-placeholder">
								<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '1rem' }}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
								<p>Drag and drop a promotion image here.</p>
							</div>
						)}
					</div>
				</section>

				<aside className="sidebar-section">
					<div className="card">
						<PropertiesPanel
							hotspot={hotspots.find((h) => h.id === selectedId)}
							updateHotspot={updateHotspot}
							deleteHotspot={deleteHotspot}
						/>
					</div>
				</aside>
			</main>

			<section className="code-section">
				<CodeGenerator
					hotspots={hotspots}
					baseImageUrl={imageConfig?.url || "YOUR_IMAGE_URL.jpg"}
					imageWidth={imageConfig?.width || 0}
					imageHeight={imageConfig?.height || 0}
				/>
			</section>
		</div>
	);
}

export default App;
