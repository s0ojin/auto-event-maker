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
	setCurrentService,
}) => {
	const [layouts, setLayouts] = useState<Template[]>([]);
	const [buttonTemplates, setButtonTemplates] = useState<Template[]>([]);
	const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");

	const [copiedHtml, setCopiedHtml] = useState(false);
	const [copiedCss, setCopiedCss] = useState(false);
	const [copiedJs, setCopiedJs] = useState(false);
	const [copiedDraftHtml, setCopiedDraftHtml] = useState(false);
	const [copiedDraftCss, setCopiedDraftCss] = useState(false);

	useEffect(() => {
		const fetchTemplates = async () => {
			const { data } = await supabase.from("master_templates").select("*");
			if (data) {
				const l = data.filter((t) => t.category === "LAYOUT");
				const b = data.filter((t) => t.category === "BUTTON");
				setLayouts(l);
				setButtonTemplates(b);

				// Try to find a layout that matches currentService initially
				const defaultLayout = l.find((tpl) => tpl.service === currentService) || l[0];
				if (defaultLayout && !selectedLayoutId) {
					setSelectedLayoutId(defaultLayout.id);
				}
			}
		};
		fetchTemplates();
	}, []);

	// Sync service when layout changes
	useEffect(() => {
		const layout = layouts.find((l) => l.id === selectedLayoutId);
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

	const { buttonsOnlyHtml, buttonsOnlyCss, htmlResult, cssResult, jsResult } = useMemo(() => {
		if (imageWidth === 0 || imageHeight === 0) {
			return { buttonsOnlyHtml: "", buttonsOnlyCss: "", htmlResult: "", cssResult: "", jsResult: "" };
		}

		let buttonsOnlyHtml = "";
		let buttonsOnlyCss = "";

		sortedHotspots.forEach((hs, index) => {
			const bid = index + 1;
			const left = ((hs.x / imageWidth) * 100).toFixed(2);
			const top = ((hs.y / imageHeight) * 100).toFixed(2);
			const width = ((hs.width / imageWidth) * 100).toFixed(2);
			const height = ((hs.height / imageHeight) * 100).toFixed(2);

			buttonsOnlyHtml += `<a href="${hs.href}" target="${hs.target}" title="${hs.title}" class="event-btn btn-${bid}"></a>\n`;
			buttonsOnlyCss += `.btn-${bid} { left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%; position:absolute; }\n`;
		});

		if (!selectedLayoutId) {
			return { buttonsOnlyHtml, buttonsOnlyCss, htmlResult: "", cssResult: "", jsResult: "" };
		}

		const layout = layouts.find((l) => l.id === selectedLayoutId);
		if (!layout) return { buttonsOnlyHtml, buttonsOnlyCss, htmlResult: "", cssResult: "", jsResult: "" };

		let finalButtonsHtml = "";
		let finalButtonsCss = "";
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
				const tpl = buttonTemplates.find((t) => t.name === hs.action_type);
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

			finalButtonsHtml += `  ${btnSnippet}\n`;
			finalButtonsCss += `.btn-${bid} { left: ${left}%; top: ${top}%; width: ${width}%; height: ${height}%; }\n`;
		});

		let finalHtml = layout.content.replace(/{{IMAGE_URL}}/gi, baseImageUrl);
		const buttonsPlaceholderRegex = /{{BUTTONS}}/gi;

		if (buttonsPlaceholderRegex.test(finalHtml)) {
			finalHtml = finalHtml.replace(buttonsPlaceholderRegex, finalButtonsHtml.trim());
		} else {
			const lastDivIndex = finalHtml.lastIndexOf("</div>");
			if (lastDivIndex !== -1) {
				finalHtml = finalHtml.substring(0, lastDivIndex) + `\n${finalButtonsHtml}` + finalHtml.substring(lastDivIndex);
			} else {
				finalHtml = finalHtml + `\n${finalButtonsHtml.trim()}`;
			}
		}

		let finalCss = layout.css_content || "";
		const cssPlaceholderRegex = /{{BUTTON_STYLES}}/gi;
		const stylesPlaceholderRegex = /{{styles}}/gi;

		if (cssPlaceholderRegex.test(finalCss)) {
			finalCss = finalCss.replace(cssPlaceholderRegex, finalButtonsCss.trim());
		} else if (stylesPlaceholderRegex.test(finalCss)) {
			finalCss = finalCss.replace(stylesPlaceholderRegex, finalButtonsCss.trim());
		} else {
			finalCss = finalCss.trim() + `\n\n/* Automatically injected button styles */\n${finalButtonsCss.trim()}`;
		}

		const finalJs = Array.from(jsCollector).join("\n\n");

		// Replace styles and javascripts inside finalHtml if placeholders exist
		if (stylesPlaceholderRegex.test(finalHtml)) {
			finalHtml = finalHtml.replace(stylesPlaceholderRegex, finalCss.trim());
		} else if (cssPlaceholderRegex.test(finalHtml)) {
			finalHtml = finalHtml.replace(cssPlaceholderRegex, finalCss.trim());
		}

		const jsPlaceholderRegex = /{{javascripts}}/gi;
		if (jsPlaceholderRegex.test(finalHtml)) {
			finalHtml = finalHtml.replace(jsPlaceholderRegex, finalJs.trim());
		}

		return { buttonsOnlyHtml, buttonsOnlyCss, htmlResult: finalHtml, cssResult: finalCss, jsResult: finalJs };
	}, [selectedLayoutId, layouts, buttonTemplates, sortedHotspots, baseImageUrl, imageWidth, imageHeight]);

	if (imageWidth === 0 || imageHeight === 0) {
		return <div className="code-panel">Upload an image to generate code.</div>;
	}

	const handleCopyDraftHtml = () => {
		navigator.clipboard.writeText(buttonsOnlyHtml);
		setCopiedDraftHtml(true);
		setTimeout(() => setCopiedDraftHtml(false), 2000);
	};

	const handleCopyDraftCss = () => {
		navigator.clipboard.writeText(buttonsOnlyCss);
		setCopiedDraftCss(true);
		setTimeout(() => setCopiedDraftCss(false), 2000);
	};

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
			<div className="code-header-unified">
				<div className="header-inner">
					<div className="title-group">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="16 18 22 12 16 6" />
							<polyline points="8 6 2 12 8 18" />
						</svg>
						<h3>Live Generator</h3>
					</div>
					<div className="layout-gallery-container">
						<span className="gallery-label">Apply JSP Layout:</span>
						<div className="layout-gallery">
							{layouts.map((l) => (
								<button
									key={l.id}
									className={`layout-card ${selectedLayoutId === l.id ? "active" : ""}`}
									onClick={() => setSelectedLayoutId(l.id)}
								>
									<div className="layout-service-mini">{l.service}</div>
									<div className="layout-name-mini">{l.name}</div>
								</button>
							))}
							{layouts.length === 0 && <div className="no-layouts-hint">No layouts found. Create one in Templates tab!</div>}
						</div>
					</div>
				</div>
			</div>

			<div className="multi-code-sections">
				<div className="code-sub-section">
					<div className="section-title">
						<span className="badge-outline">Draft</span>
						<h4>Real-time Button Snippets</h4>
					</div>
					<div className="code-grid two-columns">
						<div className="code-block">
							<div className="code-header">
								<h5>Button HTML Only</h5>
								<button className="btn-copy" onClick={handleCopyDraftHtml}>
									{copiedDraftHtml ? "Copied!" : "Copy"}
								</button>
							</div>
							<textarea readOnly value={buttonsOnlyHtml} rows={6} placeholder="Draw buttons to see live snippets..." />
						</div>
						<div className="code-block">
							<div className="code-header">
								<h5>Button CSS Only</h5>
								<button className="btn-copy" onClick={handleCopyDraftCss}>
									{copiedDraftCss ? "Copied!" : "Copy"}
								</button>
							</div>
							<textarea readOnly value={buttonsOnlyCss} rows={6} placeholder="CSS positions will appear here..." />
						</div>
					</div>
				</div>

				<div className="section-divider"></div>

				<div className="code-sub-section">
					<div className="section-title">
						<span className="badge-solid">Final</span>
						<h4>Combined Layout Output (JSP)</h4>
					</div>
					<div className="code-grid three-columns">
						<div className="code-block">
							<div className="code-header primary-block">
								<h5>Final Structure</h5>
								<button className="btn-copy" onClick={handleCopyHtml} disabled={!htmlResult}>
									{copiedHtml ? "Copied!" : "Copy"}
								</button>
							</div>
							<textarea readOnly value={htmlResult} placeholder="Combined JSP will be generated here..." />
						</div>

						<div className="code-block">
							<div className="code-header">
								<h5>Global Styles</h5>
								<button className="btn-copy" onClick={handleCopyCss} disabled={!cssResult}>
									{copiedCss ? "Copied!" : "Copy"}
								</button>
							</div>
							<textarea readOnly value={cssResult} placeholder="Final CSS combined..." />
						</div>

						<div className="code-block">
							<div className="code-header">
								<h5>JavaScript</h5>
								<button className="btn-copy" onClick={handleCopyJs} disabled={!jsResult}>
									{copiedJs ? "Copied!" : "Copy"}
								</button>
							</div>
							<textarea readOnly value={jsResult} placeholder="Aggregated JS logic..." />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CodeGenerator;
