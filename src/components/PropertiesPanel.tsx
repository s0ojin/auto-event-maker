import React from "react";
import type { Hotspot } from "../types";

interface PropertiesPanelProps {
	hotspots: Hotspot[];
	selectedId: string | null;
	setSelectedId: (id: string | null) => void;
	updateHotspot: (updated: Hotspot) => void;
	deleteHotspot: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
	hotspots, 
	selectedId, 
	setSelectedId, 
	updateHotspot, 
	deleteHotspot 
}) => {
	if (hotspots.length === 0) {
		return (
			<div className="properties-empty">
				<p>Draw a box on the image to create a button area.</p>
			</div>
		);
	}

	// Sort hotspots by Y coordinate (top to bottom), then by X coordinate (left to right)
	const sortedHotspots = [...hotspots].sort((a, b) => {
		if (a.y !== b.y) return a.y - b.y;
		return a.x - b.x;
	});

	return (
		<div className="properties-panel">
			<h3>Interactive Buttons ({hotspots.length})</h3>
			<div className="accordion-list">
				{sortedHotspots.map((hotspot, index) => (
					<div 
						key={hotspot.id} 
						className={`accordion-item ${selectedId === hotspot.id ? "active" : ""}`}
					>
						<button 
							className="accordion-header" 
							onClick={() => setSelectedId(selectedId === hotspot.id ? null : hotspot.id)}
						>
							<span className="button-index">#{index + 1}</span>
							<span className="button-title">{hotspot.title || `Button ${index + 1}`}</span>
							<svg 
								className="chevron" 
								width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
							>
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</button>
						
						<div className="accordion-content">
							<div className="form-group">
								<label>Link URL</label>
								<input
									type="text"
									value={hotspot.href}
									onChange={(e) => updateHotspot({ ...hotspot, href: e.target.value })}
									placeholder="https://..."
								/>
							</div>

							<div className="form-group">
								<label>Target</label>
								<select value={hotspot.target} onChange={(e) => updateHotspot({ ...hotspot, target: e.target.value })}>
									<option value="_blank">New Tab (_blank)</option>
									<option value="_self">Same Window (_self)</option>
								</select>
							</div>

							<div className="form-group">
								<label>Alt / Title Text</label>
								<input 
									type="text" 
									value={hotspot.title} 
									onChange={(e) => updateHotspot({ ...hotspot, title: e.target.value })} 
									placeholder={`Button ${index + 1}`}
								/>
							</div>

							<button className="btn-delete" onClick={() => deleteHotspot(hotspot.id)}>
								Delete Button
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default PropertiesPanel;
