import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import type { Hotspot, Template } from "../types";

interface CodeGeneratorProps {
	hotspots: Hotspot[];
	baseImageUrl: string;
	imageWidth: number;
	imageHeight: number;
	currentService: string;
	setCurrentService: (service: string) => void;
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({ 
	hotspots, 
	baseImageUrl, 
	imageWidth, 
	imageHeight,
	currentService,
	setCurrentService
}) => {
	const [layouts, setLayouts] = useState<Template[]>([]);
	const [buttonTemplates, setButtonTemplates] = useState<Template[]>([]);
	const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
	
	const [copiedHtml, setCopiedHtml] = useState(false);
	const [copiedCss, setCopiedCss] = useState(false);

	useEffect(() => {
		const fetchTemplates = async () => {
			const { data } = await supabase.from("master_templates").select("*");
			if (data) {
				const l = data.filter(t => t.category === "LAYOUT");
				const b = data.filter(t => t.category === "BUTTON");
				setLayouts(l);
				setButtonTemplates(b);
				
				// Try to find a layout that matches currentService initially
				const defaultLayout = l.find(tpl => tpl.service === currentService) || l[0];
				if (defaultLayout && !selectedLayoutId) {
					setSelectedLayoutId(defaultLayout.id);
				}
			}
		};
		fetchTemplates();
	}, []);
 
	// Sync service when layout changes
	useEffect(() => {
		const layout = layouts.find(l => l.id === selectedLayoutId);
		if (layout && layout.service !== currentService) {
			setCurrentService(layout.service);
		}
	}, [selectedLayoutId, layouts, currentService, setCurrentService]);

	const sortedHotspots = useMemo(() => {
		return [...hotspots].sort((a, b) => {
			if (a.y !== b.y) return a.y - b.y;
			return a.x - b.x;
		});
	}, [hotspots]);

	const { htmlResult, cssResult, jsResult } = useMemo(() => {
		if (imageWidth === 0 || imageHeight === 0 || !selectedLayoutId) {
			return { htmlResult: "", cssResult: "", jsResult: "" };
		}

		const layout = layouts.find(l => l.id === selectedLayoutId);
		if (!layout) return { htmlResult: "", cssResult: "", jsResult: "" };

		let buttonsHtml = "";
		let buttonsCss = "";
		const jsCollector = new Set<string>();

		if (layout.js_content) jsCollector.add(layout.js_content);

		sortedHotspots.forEach((hs, index) => {
			const bid = index + 1;
			const left = ((hs.x / imageWidth) * 100).toFixed(2);
			const top = ((hs.y / imageHeight) * 100).toFixed(2);
			const width = ((hs.width / imageWidth) * 100).toFixed(2);
			const height = ((hs.height / imageHeight) * 100).toFixed(2);

			let btnSnippet = "";
			if (hs.action_type === "LINK") {
				btnSnippet = `<a href="${hs.href}" target="${hs.target}" title="${hs.title}" class="event-btn btn-${bid}"></a>`;
			} else {
				const tpl = buttonTemplates.find(t => t.name === hs.action_type);
				if (tpl) {
					btnSnippet = tpl.content
						.replace(/{{HREF}}/g, hs.href)
						.replace(/{{TITLE}}/g, hs.title)
						.replace(/{{ID}}/g, bid.toString())
						.replace(/{{METADATA\.value}}/g, hs.metadata?.value || "");
					
					if (tpl.js_content) jsCollector.add(tpl.js_content);
				} else {
					btnSnippet = `<!-- Template ${hs.action_type} not found -->`;
				}
			}

			buttonsHtml += `  ${btnSnippet}\n`;
			buttonsCss += `.btn-${bid} { left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%; }\n`;
		});

		const finalHtml = layout.content
			.replace(/{{IMAGE_URL}}/g, baseImageUrl)
			.replace(/{{BUTTONS}}/g, buttonsHtml.trim());

		const finalCss = (layout.css_content || "")
			.replace(/{{BUTTON_STYLES}}/g, buttonsCss.trim());

		const finalJs = Array.from(jsCollector).join("\n\n");

		return { htmlResult: finalHtml, cssResult: finalCss, jsResult: finalJs };
	}, [selectedLayoutId, layouts, buttonTemplates, sortedHotspots, baseImageUrl, imageWidth, imageHeight]);

	if (imageWidth === 0 || imageHeight === 0) {
		return <div className="code-panel">Upload an image to generate code.</div>;
	}

	const [copiedJs, setCopiedJs] = useState(false);

	const handleCopyHtml = () => {
		navigator.clipboard.writeText(htmlResult);
		setCopiedHtml(true);
		setTimeout(() => setCopiedHtml(false), 2000);
	};

	const handleCopyCss = () => {
		navigator.clipboard.writeText(`<style>\n${cssResult}\n</style>`);
		setCopiedCss(true);
		setTimeout(() => setCopiedCss(false), 2000);
	};

	const handleCopyJs = () => {
		navigator.clipboard.writeText(`<script>\n${jsResult}\n</script>`);
		setCopiedJs(true);
		setTimeout(() => setCopiedJs(false), 2000);
	};

	return (
		<div className="code-panel">
			<div className="code-header">
// ... (title parts) ...
			</div>
			
			<div className="code-grid three-columns">
				<div className="code-block">
					<div className="code-header">
						<h4>Final Structure</h4>
						<button className="btn-copy" onClick={handleCopyHtml} disabled={!htmlResult}>
							{copiedHtml ? "Copied!" : "Copy Result"}
						</button>
					</div>
					<textarea readOnly value={htmlResult} placeholder="Select a layout and draw buttons..." />
				</div>

				<div className="code-block">
					<div className="code-header">
						<h4>CSS Styles</h4>
						<button className="btn-copy" onClick={handleCopyCss} disabled={!cssResult}>
							{copiedCss ? "Copied!" : "Copy CSS"}
						</button>
					</div>
					<textarea readOnly value={cssResult} placeholder="Styles will appear here..." />
				</div>

				<div className="code-block">
					<div className="code-header">
						<h4>JavaScript</h4>
						<button className="btn-copy" onClick={handleCopyJs} disabled={!jsResult}>
							{copiedJs ? "Copied!" : "Copy JS"}
						</button>
					</div>
					<textarea readOnly value={jsResult} placeholder="JavaScript logic will appear here..." />
				</div>
			</div>
		</div>
	);
};

export default CodeGenerator;
