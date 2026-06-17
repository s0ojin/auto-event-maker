import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Hotspot, Template } from "../types";

interface PropertiesPanelProps {
	hotspots: Hotspot[];
	selectedId: string | null;
	setSelectedId: (id: string | null) => void;
	updateHotspot: (updated: Hotspot) => void;
	deleteHotspot: (id: string) => void;
	currentService: string;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
	hotspots,
	selectedId,
	setSelectedId,
	updateHotspot,
	deleteHotspot,
	currentService,
}) => {
	const [buttonTemplates, setButtonTemplates] = useState<Template[]>([]);

	useEffect(() => {
		const fetchButtonTemplates = async () => {
			const { data } = await supabase
				.from("master_templates")
				.select("*")
				.eq("category", "BUTTON")
				.eq("service", currentService);
			
			const mapped = (data || []).map((t) => {
				if (t.name.startsWith("[CUSTOM] ")) {
					return {
						...t,
						category: "CUSTOM",
						name: t.name.slice(9),
					};
				}
				return t;
			});
			setButtonTemplates(mapped);
		};
		fetchButtonTemplates();
	}, [currentService]);

	if (hotspots.length === 0) {
		return (
			<div className="properties-empty">
				<p>Draw a box on the image to create a button area.</p>
			</div>
		);
	}

	const sortedHotspots = [...hotspots].sort((a, b) => {
		if (a.y !== b.y) return a.y - b.y;
		return a.x - b.x;
	});

	return (
		<div className="properties-panel">
			<h3>Interactive Buttons ({hotspots.length})</h3>
			<div className="accordion-list">
				{sortedHotspots.map((hotspot, index) => (
					<div key={hotspot.id} className={`accordion-item ${selectedId === hotspot.id ? "active" : ""}`}>
						<button className="accordion-header" onClick={() => setSelectedId(selectedId === hotspot.id ? null : hotspot.id)}>
							<span className="button-index">#{index + 1}</span>
							<span className="button-title">{hotspot.title || `Button ${index + 1}`}</span>
							{hotspot.action_type !== "LINK" && <span className="action-tag">{hotspot.action_type}</span>}
							<svg
								className="chevron"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<polyline points="6 9 12 15 18 9"></polyline>
							</svg>
						</button>

						<div className="accordion-content">
							<div className="form-group">
								<label>Action Type (Template)</label>
								<select value={hotspot.action_type} onChange={(e) => updateHotspot({ ...hotspot, action_type: e.target.value })}>
									<option value="">-- 선택하세요 --</option>
									<option value="LINK">기본 링크 (LINK)</option>
									{buttonTemplates.map((t) => (
										<option key={t.id} value={t.name}>
											{t.name} ({t.category})
										</option>
									))}
								</select>
							</div>

							{(() => {
								const selectedTemplate = buttonTemplates.find((t) => t.name === hotspot.action_type);
								if (!selectedTemplate) return null;
								
								// Find metadata keys
								const regex = /{{METADATA\.(.*?)}}/g;
								const keys: string[] = [];
								const searchIn = [
									selectedTemplate.content || "",
									selectedTemplate.css_content || "",
									selectedTemplate.js_content || ""
								].join("\n");
								let match;
								while ((match = regex.exec(searchIn)) !== null) {
									const key = match[1].trim();
									if (!keys.includes(key)) {
										keys.push(key);
									}
								}
								
								if (keys.length === 0) return null;
								
								return (
									<div className="metadata-fields" style={{ borderLeft: "2px solid var(--accent-color)", paddingLeft: "12px", marginBottom: "1rem" }}>
										<div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--accent-color)", marginBottom: "8px", textTransform: "uppercase" }}>Template Variables</div>
										{keys.map((key) => (
											<div className="form-group" key={key}>
												<label>{key}</label>
												<input
													type="text"
													value={hotspot.metadata?.[key] || ""}
													onChange={(e) => {
														const updatedMetadata = {
															...(hotspot.metadata || {}),
															[key]: e.target.value,
														};
														updateHotspot({ ...hotspot, metadata: updatedMetadata });
													}}
													placeholder={`Value for {{METADATA.${key}}}`}
												/>
											</div>
										))}
									</div>
								);
							})()}

							<div className="form-group">
								<label>Title Text (Alt)</label>
								<input
									type="text"
									value={hotspot.title}
									onChange={(e) => updateHotspot({ ...hotspot, title: e.target.value })}
									placeholder="Button Label"
								/>
							</div>

							<div className="form-group">
								<label>Link URL</label>
								<input
									type="text"
									value={hotspot.href}
									onChange={(e) => updateHotspot({ ...hotspot, href: e.target.value })}
									placeholder="https://... ({{HREF}})"
								/>
							</div>
							<div className="form-group">
								<label>Target</label>
								<select value={hotspot.target} onChange={(e) => updateHotspot({ ...hotspot, target: e.target.value })}>
									<option value="_blank">새창 (_blank)</option>
									<option value="_self">현재창 (_self)</option>
								</select>
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
