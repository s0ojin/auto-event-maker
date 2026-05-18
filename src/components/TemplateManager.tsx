import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Template } from "../types";

const TemplateManager: React.FC = () => {
	const [templates, setTemplates] = useState<Template[]>([]);
	const [loading, setLoading] = useState(true);
	const [editingId, setEditingId] = useState<string | null>(null);
	
	// Form State
	const [formData, setFormData] = useState<Partial<Template>>({
		name: "",
		service: "HAPPYORDER",
		category: "LAYOUT",
		content: "",
		css_content: "",
	});

	const fetchTemplates = async () => {
		try {
			setLoading(true);
			const { data, error } = await supabase
				.from("master_templates")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;
			setTemplates(data || []);
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
			const payload = {
				name: formData.name,
				service: formData.service,
				category: formData.category,
				content: formData.content,
				css_content: formData.css_content,
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
				const { error } = await supabase
					.from("master_templates")
					.insert([{
						...payload,
						created_at: new Date().toISOString(),
						updated_at: new Date().toISOString(),
					}]);

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
			});
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
		});
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this template?")) return;
		try {
			const { error } = await supabase
				.from("master_templates")
				.delete()
				.eq("id", id);

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
		});
	};

	return (
		<div className="template-manager">
			<div className="card form-card">
				<div className="card-title-group">
					<h3>{editingId ? "Edit Template" : "Register New Template"}</h3>
					<div className="category-tabs">
						<button 
							type="button" 
							className={`mini-tab ${formData.category === "LAYOUT" ? "active" : ""}`}
							onClick={() => setFormData(p => ({...p, category: "LAYOUT"}))}
						>
							LAYOUT (JSP)
						</button>
						<button 
							type="button" 
							className={`mini-tab ${formData.category === "BUTTON" ? "active" : ""}`}
							onClick={() => setFormData(p => ({...p, category: "BUTTON"}))}
						>
							BUTTON
						</button>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="template-form">
					<div className="form-row">
						<div className="form-group">
							<label>Template Name</label>
							<input
								type="text"
								name="name"
								placeholder={formData.category === "LAYOUT" ? "e.g. Standard Mobile JSP" : "e.g. Coupon Issue Button"}
								value={formData.name}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="form-group">
							<label>Service Type</label>
							<select name="service" value={formData.service} onChange={handleInputChange}>
								<option value="HAPPYORDER">해피오더 (HAPPY ORDER)</option>
								<option value="HAPPYPOINT">해피포인트 (HAPPY POINT)</option>
								<option value="SPC_ETC">기타 SPC (ETC)</option>
								<option value="GENERIC">일반 (GENERIC)</option>
							</select>
						</div>
					</div>

					<div className="form-group">
						<label>
							{formData.category === "LAYOUT" ? "JSP/HTML Structure" : "Button HTML Snippet"} 
							<span className="label-hint">
								{formData.category === "LAYOUT" 
									? " (Use: {{IMAGE_URL}}, {{BUTTONS}})" 
									: " (Use: {{HREF}}, {{TITLE}}, {{METADATA.key}})"}
							</span>
						</label>
						<textarea
							name="content"
							rows={8}
							placeholder={formData.category === "LAYOUT" 
								? '<%@ page ... %>\n<div class="event-wrap">\n  <img src="{{IMAGE_URL}}">\n  {{BUTTONS}}\n</div>' 
								: '<a href="{{HREF}}" class="btn-{{ID}}" onclick="clickLog(\'{{TITLE}}\')"></a>'}
							value={formData.content}
							onChange={handleInputChange}
							required
						/>
					</div>

					{formData.category === "LAYOUT" && (
						<div className="form-group">
							<label>Global CSS (Optional) <span className="label-hint">(Use: {"{{BUTTON_STYLES}}"})</span></label>
							<textarea
								name="css_content"
								rows={4}
								value={formData.css_content}
								onChange={handleInputChange}
							/>
						</div>
					)}

					<div className="form-group">
						<label>
							JavaScript Logic (Optional)
							<span className="label-hint"> (Functions, listeners, Kakao SDK, etc.)</span>
						</label>
						<textarea
							name="js_content"
							rows={4}
							placeholder="function shareKakao() { ... }"
							value={formData.js_content}
							onChange={handleInputChange}
						/>
					</div>

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

			<div className="templates-list-section">
				<h3>Registered Templates</h3>
				{loading ? (
					<p>Loading templates...</p>
				) : (
					<div className="templates-grid">
						{templates.length === 0 ? (
							<div className="empty-state">No templates found. Register your first one!</div>
						) : (
							templates.map((t) => (
								<div key={t.id} className="template-card card">
									<div className="template-card-header">
										<div>
											<span className={`category-badge ${t.category.toLowerCase()}`}>{t.category}</span>
											<span className={`service-badge ${t.service.toLowerCase()}`}>{t.service}</span>
											<h4>{t.name}</h4>
										</div>
										<div className="card-actions">
											<button className="btn-icon" onClick={() => handleEdit(t)} title="Edit">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
											</button>
											<button className="btn-icon delete" onClick={() => handleDelete(t.id)} title="Delete">
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
											</button>
										</div>
									</div>
									<div className="template-preview">
										<code style={{ whiteSpace: 'pre-wrap', maxHeight: '100px', display: 'block', overflow: 'hidden' }}>
											{t.content}
										</code>
									</div>
								</div>
							))
						)}
					</div>
				)}
			</div>
		</div>
	);
};

export default TemplateManager;
