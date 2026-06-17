import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Template } from "../types";

const TemplateManager: React.FC = () => {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);

	// Form State for Layouts (or raw template)
	const [formData, setFormData] = useState<Partial<Template>>({
		name: "",
		service: "HAPPYORDER",
		category: "LAYOUT",
		content: "",
		css_content: "",
		js_content: "",
	});

	// Dedicated Form State for Buttons
	const [btnLabel, setBtnLabel] = useState("");
	const [btnType, setBtnType] = useState("");
	const [btnOnClick, setBtnOnClick] = useState("");

	const fetchTemplates = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase.from("master_templates").select("*").order("created_at", { ascending: false });

			if (error) throw error;
			
			const mapped = (data || []).map((t) => {
				if (t.category === "BUTTON" && t.name.startsWith("[CUSTOM] ")) {
					return {
						...t,
						category: "CUSTOM",
						name: t.name.slice(9),
					};
				}
				return t;
			});
			setTemplates(mapped);
		} catch (err: any) {
			console.error("Error fetching templates:", err.message);
			alert("Failed to load templates.");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchTemplates();
	}, []);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			let finalName = formData.name;
			let finalContent = formData.content;

			if (formData.category === "BUTTON") {
				// Serialize button data
				finalName = `${btnLabel.trim()} (${btnType.trim().toUpperCase()})`;
				finalContent = `<button type="button" class="event-btn btn-{{ID}}" onclick="${btnOnClick.trim()}" ></button>`;
			}

			const payload = {
				name: formData.category === "CUSTOM" ? `[CUSTOM] ${formData.name}` : finalName,
				service: formData.service,
				category: formData.category === "CUSTOM" ? "BUTTON" : formData.category,
				content: finalContent,
				css_content: formData.category === "BUTTON" ? "" : (formData.css_content || ""),
				js_content: formData.js_content || "",
			};

			if (editingId) {
				const { error } = await supabase
					.from("master_templates")
					.update({
						...payload,
						updated_at: new Date().toISOString(),
					})
					.eq("id", editingId);

				if (error) throw error;
				alert("Template updated successfully!");
			} else {
				const { error } = await supabase.from("master_templates").insert([
					{
						...payload,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					},
				]);

				if (error) throw error;
				alert("Template created successfully!");
			}

			setEditingId(null);
			setFormData({
				name: "",
				service: "HAPPYORDER",
				category: "LAYOUT",
				content: "",
				css_content: "",
				js_content: "",
			});
			setBtnLabel("");
			setBtnType("");
			setBtnOnClick("");
			fetchTemplates();
		} catch (err: any) {
			console.error("Error saving template:", err.message);
			alert("Failed to save template.");
		}
	};

	const handleEdit = (template: Template) => {
		setEditingId(template.id);
		setFormData({
			name: template.name,
			service: template.service,
			category: template.category,
			content: template.content,
			css_content: template.css_content,
			js_content: template.js_content || "",
		});

		if (template.category === "BUTTON") {
			const match = template.name.match(/^(.*?)\s*\((.*?)\)$/);
			if (match) {
				setBtnLabel(match[1]);
				setBtnType(match[2]);
			} else {
				setBtnLabel(template.name);
				setBtnType(template.name);
			}

			const onclickMatch = template.content.match(/onclick="([^"]*)"/);
			if (onclickMatch) {
				setBtnOnClick(onclickMatch[1]);
			} else {
				setBtnOnClick("");
			}
		}

		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this template?")) return;
		try {
			const { error } = await supabase.from("master_templates").delete().eq("id", id);

			if (error) throw error;
			setTemplates(templates.filter((t) => t.id !== id));
		} catch (err: any) {
			console.error("Error deleting template:", err.message);
			alert("Failed to delete template.");
		}
	};

	const cancelEdit = () => {
		setEditingId(null);
		setFormData({
			name: "",
			service: "HAPPYORDER",
			category: "LAYOUT",
			content: "",
			css_content: "",
			js_content: "",
		});
		setBtnLabel("");
		setBtnType("");
		setBtnOnClick("");
	};

	const layouts = templates.filter((t) => t.category?.toUpperCase() === "LAYOUT");
	const buttons = templates.filter((t) => t.category?.toUpperCase() === "BUTTON");
	const customs = templates.filter((t) => t.category?.toUpperCase() === "CUSTOM");

	return (
		<div className="template-manager">
			<div className="card form-card">
				<div className="card-title-group">
					<h3>{editingId ? "Edit Template" : "Register New Template"}</h3>
					<div className="category-tabs">
						<button
							type="button"
							className={`mini-tab ${formData.category === "LAYOUT" ? "active" : ""}`}
							onClick={() => setFormData((p) => ({ ...p, category: "LAYOUT" }))}
						>
							LAYOUT (JSP)
						</button>
						<button
							type="button"
							className={`mini-tab ${formData.category === "BUTTON" ? "active" : ""}`}
							onClick={() => setFormData((p) => ({ ...p, category: "BUTTON" }))}
						>
							BUTTON
						</button>
						<button
							type="button"
							className={`mini-tab ${formData.category === "CUSTOM" ? "active" : ""}`}
							onClick={() => setFormData((p) => ({ ...p, category: "CUSTOM" }))}
						>
							CUSTOM (HTML)
						</button>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="template-form">
					{formData.category === "LAYOUT" && (
						<>
							<div className="form-row">
								<div className="form-group">
									<label>Template Name</label>
									<input
										type="text"
										name="name"
										placeholder="e.g. Standard Mobile JSP"
										value={formData.name || ""}
										onChange={handleInputChange}
										required
									/>
								</div>
								<div className="form-group">
									<label>Service Type</label>
									<select name="service" value={formData.service} onChange={handleInputChange}>
										<option value="HAPPYPOINT">해피포인트 (HAPPY POINT)</option>
										<option value="HAPPYORDER">해피오더 (HAPPY ORDER)</option>
									</select>
								</div>
							</div>

							<div className="form-group">
								<label>
									JSP/HTML Structure
									<span className="label-hint">{" (Use: {{IMAGE_URL}}, {{IMAGE_NAME}}, {{buttons}}, {{styles}}, {{javascripts}})"}</span>
								</label>
								<textarea
									name="content"
									rows={8}
									placeholder={'<%@ page ... %>\n<div class="event-wrap">\n  <img src="{{IMAGE_URL}}" data-name="{{IMAGE_NAME}}">\n  {{BUTTONS}}\n</div>'}
									value={formData.content || ""}
									onChange={handleInputChange}
									required
								/>
							</div>

							<div className="form-group">
								<label>
									Global CSS (Optional) <span className="label-hint">{"(Use: {{styles}} or {{BUTTON_STYLES}})"}</span>
								</label>
								<textarea name="css_content" rows={4} value={formData.css_content || ""} onChange={handleInputChange} />
							</div>

							<div className="form-group">
								<label>
									JavaScript Logic (Optional)
									<span className="label-hint"> (Functions, Kakao SDK, etc. Injected into {"{{javascripts}}"})</span>
								</label>
								<textarea
									name="js_content"
									rows={4}
									placeholder="function initEvent() { ... }"
									value={formData.js_content || ""}
									onChange={handleInputChange}
								/>
							</div>
						</>
					)}

					{formData.category === "CUSTOM" && (
						<>
							<div className="form-row">
								<div className="form-group">
									<label>Template Name</label>
									<input
										type="text"
										name="name"
										placeholder="e.g. YouTube Embed, Kakao Map"
										value={formData.name || ""}
										onChange={handleInputChange}
										required
									/>
								</div>
								<div className="form-group">
									<label>Service Type</label>
									<select name="service" value={formData.service} onChange={handleInputChange}>
										<option value="HAPPYPOINT">해피포인트 (HAPPY POINT)</option>
										<option value="HAPPYORDER">해피오더 (HAPPY ORDER)</option>
									</select>
								</div>
							</div>

							<div className="form-group">
								<label>
									HTML Structure / Snippet
									<span className="label-hint">{" (Use: {{ID}}, {{HREF}}, {{TITLE}}, {{METADATA.key_name}}, {{COUPON_INDEX}})"}</span>
								</label>
								<textarea
									name="content"
									rows={8}
									placeholder={'<div class="event-custom custom_html-{{ID}}">\n  <iframe src="https://www.youtube.com/embed/{{METADATA.youtube_id}}" width="100%" height="100%" frameborder="0"></iframe>\n</div>'}
									value={formData.content || ""}
									onChange={handleInputChange}
									required
								/>
							</div>

							<div className="form-group">
								<label>
									Global/Component CSS (Optional) <span className="label-hint">{"(Use: {{ID}} or {{COUPON_INDEX}})"}</span>
								</label>
								<textarea name="css_content" rows={4} placeholder={'.custom_html-{{ID}} iframe {\n  border-radius: 8px;\n}'} value={formData.css_content || ""} onChange={handleInputChange} />
							</div>

							<div className="form-group">
								<label>
									JavaScript Logic (Optional)
									<span className="label-hint"> (Functions / Initialization scripts)</span>
								</label>
								<textarea
									name="js_content"
									rows={4}
									placeholder="console.log('Custom HTML component loaded');"
									value={formData.js_content || ""}
									onChange={handleInputChange}
								/>
							</div>
						</>
					)}

					{formData.category === "BUTTON" && (
						<>
							<div className="form-row">
								<div className="form-group">
									<label>버튼 이름 (한글)</label>
									<input
										type="text"
										placeholder="e.g. 카카오 공유하기"
										value={btnLabel}
										onChange={(e) => setBtnLabel(e.target.value)}
										required
									/>
								</div>
								<div className="form-group">
									<label>actionType (영문)</label>
									<input
										type="text"
										placeholder="e.g. SHARE_KAKAO, COUPON, LINK"
										value={btnType}
										onChange={(e) => setBtnType(e.target.value)}
										required
									/>
								</div>
								<div className="form-group">
									<label>Service Type</label>
									<select name="service" value={formData.service} onChange={handleInputChange}>
										<option value="HAPPYPOINT">해피포인트 (HAPPY POINT)</option>
										<option value="HAPPYORDER">해피오더 (HAPPY ORDER)</option>
									</select>
								</div>
							</div>

							<div className="form-group">
								<label>
									onClick 액션 실행코드
									<span className="label-hint">{" (Tip: {{HREF}}, {{METADATA.key}}, {{ID}}, {{COUPON_INDEX}} 사용 가능)"}</span>
								</label>
								<input
									type="text"
									placeholder="e.g. shareKakao('{{METADATA.value}}')"
									value={btnOnClick}
									onChange={(e) => setBtnOnClick(e.target.value)}
									required
									style={{
										width: "100%",
										padding: "10px",
										borderRadius: "8px",
										border: "1px solid var(--border-color)",
										background: "var(--input-bg)",
										color: "var(--text-primary)",
									}}
								/>
							</div>

							<div className="form-group">
								<label>
									JavaScript Logic (Optional)
									<span className="label-hint"> (버튼 클릭 시 실행될 함수 구현부 등)</span>
								</label>
								<textarea
									name="js_content"
									rows={4}
									placeholder={'function shareKakao(val) {\n  console.log("Share logic with:", val);\n}'}
									value={formData.js_content || ""}
									onChange={handleInputChange}
								/>
							</div>
						</>
					)}

					<div className="form-actions">
						{editingId && (
							<button type="button" className="btn-secondary" onClick={cancelEdit}>
								Cancel
							</button>
						)}
						<button type="submit" className="btn-primary">
							{editingId ? "Update Template" : "Save Template"}
						</button>
					</div>
				</form>
			</div>

			<div className="templates-list-section" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
				<div>
					<h3>Layout Templates ({layouts.length})</h3>
					{loading ? (
						<p>Loading...</p>
					) : (
						<div className="templates-grid" style={{ gridTemplateColumns: "1fr" }}>
							{layouts.length === 0 ? (
								<div className="empty-state">No layouts found.</div>
							) : (
								layouts.map((t) => (
									<div key={t.id} className="template-card card">
										<div className="template-card-header">
											<div>
												<span className={`category-badge layout`}>LAYOUT</span>
												<span className={`service-badge ${t.service.toLowerCase()}`}>{t.service}</span>
												<h4>{t.name}</h4>
											</div>
											<div className="card-actions">
												<button className="btn-icon" onClick={() => handleEdit(t)} title="Edit">
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
													</svg>
												</button>
												<button className="btn-icon delete" onClick={() => handleDelete(t.id)} title="Delete">
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<polyline points="3 6 5 6 21 6" />
														<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
														<line x1="10" y1="11" x2="10" y2="17" />
														<line x1="14" y1="11" x2="14" y2="17" />
													</svg>
												</button>
											</div>
										</div>
										<div className="template-preview">
											<code style={{ whiteSpace: "pre-wrap", maxHeight: "100px", display: "block", overflow: "hidden" }}>{t.content}</code>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
				<div>
					<h3>Button Templates ({buttons.length})</h3>
					{loading ? (
						<p>Loading...</p>
					) : (
						<div className="templates-grid" style={{ gridTemplateColumns: "1fr" }}>
							{buttons.length === 0 ? (
								<div className="empty-state">No buttons found.</div>
							) : (
								buttons.map((t) => (
									<div key={t.id} className="template-card card" style={{ borderColor: "var(--accent-color)" }}>
										<div className="template-card-header">
											<div>
												<span className={`category-badge button`}>BUTTON</span>
												<span className={`service-badge ${t.service.toLowerCase()}`}>{t.service}</span>
												<h4>{t.name}</h4>
											</div>
											<div className="card-actions">
												<button className="btn-icon" onClick={() => handleEdit(t)} title="Edit">
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
													</svg>
												</button>
												<button className="btn-icon delete" onClick={() => handleDelete(t.id)} title="Delete">
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<polyline points="3 6 5 6 21 6" />
														<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
														<line x1="10" y1="11" x2="10" y2="17" />
														<line x1="14" y1="11" x2="14" y2="17" />
													</svg>
												</button>
											</div>
										</div>
										<div className="template-preview">
											<code style={{ whiteSpace: "pre-wrap", maxHeight: "100px", display: "block", overflow: "hidden" }}>{t.content}</code>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
				<div>
					<h3>Custom HTML Templates ({customs.length})</h3>
					{loading ? (
						<p>Loading...</p>
					) : (
						<div className="templates-grid" style={{ gridTemplateColumns: "1fr" }}>
							{customs.length === 0 ? (
								<div className="empty-state">No custom templates found.</div>
							) : (
								customs.map((t) => (
									<div key={t.id} className="template-card card" style={{ borderColor: "#a855f7" }}>
										<div className="template-card-header">
											<div>
												<span className={`category-badge`}>CUSTOM</span>
												<span className={`service-badge ${t.service.toLowerCase()}`}>{t.service}</span>
												<h4>{t.name}</h4>
											</div>
											<div className="card-actions">
												<button className="btn-icon" onClick={() => handleEdit(t)} title="Edit">
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
														<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
													</svg>
												</button>
												<button className="btn-icon delete" onClick={() => handleDelete(t.id)} title="Delete">
													<svg
														width="16"
														height="16"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													>
														<polyline points="3 6 5 6 21 6" />
														<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
														<line x1="10" y1="11" x2="10" y2="17" />
														<line x1="14" y1="11" x2="14" y2="17" />
													</svg>
												</button>
											</div>
										</div>
										<div className="template-preview">
											<code style={{ whiteSpace: "pre-wrap", maxHeight: "100px", display: "block", overflow: "hidden" }}>{t.content}</code>
										</div>
									</div>
								))
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default TemplateManager;
