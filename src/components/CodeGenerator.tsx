import React, { useState } from "react";
import type { Hotspot } from "../types";

interface CodeGeneratorProps {
	hotspots: Hotspot[];
	baseImageUrl: string;
	imageWidth: number;
	imageHeight: number;
}

const CodeGenerator: React.FC<CodeGeneratorProps> = ({ hotspots, baseImageUrl, imageWidth, imageHeight }) => {
	const [copiedHtml, setCopiedHtml] = useState(false);
	const [copiedCss, setCopiedCss] = useState(false);

	if (imageWidth === 0 || imageHeight === 0) {
		return <div className="code-panel">Upload an image to generate code.</div>;
	}

	// Sort hotspots by Y coordinate (top to bottom), then by X coordinate (left to right)
	const sortedHotspots = [...hotspots].sort((a, b) => {
		if (a.y !== b.y) return a.y - b.y;
		return a.x - b.x;
	});

	let cssStr = `.event-container {
  position: relative;
  max-width: 100%;
  display: inline-block;
}
.event-container img {
  width: 100%;
  height: auto;
  display: block;
}
.event-btn {
  position: absolute;
  display: block;
  z-index: 10;
  cursor: pointer;
  /* border: 1px solid red; Uncomment to debug positions */
}
`;

	let htmlStr = `<div class="event-container">\n  <img src="${baseImageUrl}" alt="Event Promotion">\n`;
 
	sortedHotspots.forEach((hs, index) => {
		const left = ((hs.x / imageWidth) * 100).toFixed(2);
		const top = ((hs.y / imageHeight) * 100).toFixed(2);
		const width = ((hs.width / imageWidth) * 100).toFixed(2);
		const height = ((hs.height / imageHeight) * 100).toFixed(2);

		const className = `event-btn-${index + 1}`;

		cssStr += `.${className} {
  left: ${left}%;
  top: ${top}%;
  width: ${width}%;
  height: ${height}%;
}\n`;

		htmlStr += `  <a href="${hs.href}" target="${hs.target}" title="${hs.title}" class="event-btn ${className}"></a>\n`;
	});

	htmlStr += `</div>`;

	const handleCopyHtml = () => {
		navigator.clipboard.writeText(htmlStr);
		setCopiedHtml(true);
		setTimeout(() => setCopiedHtml(false), 2000);
	};

	const handleCopyCss = () => {
		navigator.clipboard.writeText(`<style>\n${cssStr}</style>`);
		setCopiedCss(true);
		setTimeout(() => setCopiedCss(false), 2000);
	};

	return (
		<div className="code-panel">
			<div className="code-header">
				<h3>Generated Code</h3>
			</div>
			
			<div className="code-grid">
				<div className="code-block">
					<div className="code-header">
						<h4>HTML Structure</h4>
						<button className="btn-copy" onClick={handleCopyHtml}>
							{copiedHtml ? "Copied!" : "Copy HTML"}
						</button>
					</div>
					<textarea readOnly value={htmlStr} />
				</div>

				<div className="code-block">
					<div className="code-header">
						<h4>CSS Styles</h4>
						<button className="btn-copy" onClick={handleCopyCss}>
							{copiedCss ? "Copied!" : "Copy CSS"}
						</button>
					</div>
					<textarea readOnly value={cssStr} />
				</div>
			</div>
		</div>
	);
};

export default CodeGenerator;
