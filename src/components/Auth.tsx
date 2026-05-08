import React, { useState } from "react";
import { supabase } from "../lib/supabase";

interface AuthProps {
	onClose: () => void;
}

const Auth: React.FC<AuthProps> = ({ onClose }) => {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(error.message);
		} else {
			onClose();
		}
		setLoading(false);
	};

	return (
		<div className="modal-overlay">
			<div className="modal-content auth-modal">
				<button className="btn-close" onClick={onClose}>
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
				
				<div className="auth-header">
					<h2>Admin Login</h2>
					<p>Sign in to access advanced features</p>
				</div>

				<form onSubmit={handleAuth} className="auth-form">
					<div className="input-group">
						<label htmlFor="email">Email</label>
						<input
							id="email"
							type="email"
							placeholder="admin@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<div className="input-group">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							placeholder="••••••••"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>
					
					{error && <div className="auth-error">{error}</div>}
					
					<button type="submit" className="btn-primary" disabled={loading}>
						{loading ? "Signing in..." : "Sign In"}
					</button>
				</form>
				
				<div className="auth-footer">
					<p className="footer-warning">This is a protected area for administrators only.</p>
				</div>
			</div>
		</div>
	);
};

export default Auth;
