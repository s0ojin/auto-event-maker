import React from "react";
import type { Hotspot } from "../types";

interface PropertiesPanelProps {
	hotspot: Hotspot | undefined;
	updateHotspot: (updated: Hotspot) => void;
	deleteHotspot: (id: string) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ hotspot, updateHotspot, deleteHotspot }) => {
	if (!hotspot) {
		return (
			<div className="properties-empty">
				<p>Select a box to edit its properties.</p>
			</div>
		);
	}

	return (
		<div className="properties-panel">
			<h3>Button Properties</h3>

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
				<input type="text" value={hotspot.title} onChange={(e) => updateHotspot({ ...hotspot, title: e.target.value })} />
			</div>

			<button className="btn-delete" onClick={() => deleteHotspot(hotspot.id)}>
				Delete Button
			</button>
		</div>
	);
};

export default PropertiesPanel;
