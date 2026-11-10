-- ============================================================================
-- NyayaNiti — Staging Schema-Only Initialization DDL (PostgreSQL Dialect)
-- Version: 1.0 (Zero-Cost Neon PostgreSQL BYTEA Storage)
-- Purpose: Creates all 31 application tables, foreign keys, and indexes
-- Notice: Safe, additive, idempotent DDL for empty staging database
-- ============================================================================

-- Table: bureaus
CREATE TABLE IF NOT EXISTS bureaus (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_bureaus_id ON bureaus (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_bureaus_code ON bureaus (code);

-- Table: complainants
CREATE TABLE IF NOT EXISTS complainants (
	id SERIAL NOT NULL, 
	full_name VARCHAR(200) NOT NULL, 
	email VARCHAR(200) NOT NULL, 
	mobile VARCHAR(20) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	is_active BOOLEAN, 
	is_email_verified BOOLEAN, 
	is_mobile_verified BOOLEAN, 
	complainant_type VARCHAR(50), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_complainants_email ON complainants (email);
CREATE INDEX IF NOT EXISTS ix_complainants_id ON complainants (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_complainants_mobile ON complainants (mobile);

-- Table: complaint_categories
CREATE TABLE IF NOT EXISTS complaint_categories (
	id SERIAL NOT NULL, 
	code VARCHAR(50) NOT NULL, 
	name VARCHAR(200) NOT NULL, 
	description TEXT, 
	default_priority VARCHAR(20), 
	sla_days INTEGER, 
	is_active BOOLEAN, 
	PRIMARY KEY (id), 
	UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS ix_complaint_categories_id ON complaint_categories (id);

-- Table: institutions
CREATE TABLE IF NOT EXISTS institutions (
	id SERIAL NOT NULL, 
	permanent_id VARCHAR(100) NOT NULL, 
	official_name VARCHAR(300) NOT NULL, 
	address TEXT NOT NULL, 
	city VARCHAR(100) NOT NULL, 
	district VARCHAR(100) NOT NULL, 
	state VARCHAR(100) NOT NULL, 
	region VARCHAR(100) NOT NULL, 
	pincode VARCHAR(20), 
	verification_status VARCHAR(50), 
	verification_evidence JSON, 
	email VARCHAR(200), 
	phone VARCHAR(50), 
	website VARCHAR(200), 
	institution_type VARCHAR(100), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ix_institutions_id ON institutions (id);
CREATE INDEX IF NOT EXISTS ix_institutions_district ON institutions (district);
CREATE INDEX IF NOT EXISTS ix_institutions_state ON institutions (state);
CREATE UNIQUE INDEX IF NOT EXISTS ix_institutions_permanent_id ON institutions (permanent_id);
CREATE INDEX IF NOT EXISTS ix_institutions_official_name ON institutions (official_name);
CREATE INDEX IF NOT EXISTS ix_institutions_region ON institutions (region);

-- Table: compliance_score_snapshots
CREATE TABLE IF NOT EXISTS compliance_score_snapshots (
	id SERIAL NOT NULL, 
	institution_id INTEGER NOT NULL, 
	assessment_period VARCHAR(50) NOT NULL, 
	compliance_percentage FLOAT NOT NULL, 
	assessment_coverage_pct FLOAT NOT NULL, 
	total_applicable_requirements INTEGER NOT NULL, 
	verified_compliant_count INTEGER NOT NULL, 
	partially_compliant_count INTEGER NOT NULL, 
	non_compliant_count INTEGER NOT NULL, 
	unassessed_count INTEGER NOT NULL, 
	pending_evidence_count INTEGER NOT NULL, 
	risk_tier VARCHAR(50) NOT NULL, 
	calculation_version VARCHAR(50), 
	formula_breakdown JSON NOT NULL, 
	calculated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id)
);

CREATE INDEX IF NOT EXISTS ix_compliance_score_snapshots_id ON compliance_score_snapshots (id);
CREATE INDEX IF NOT EXISTS ix_compliance_score_snapshots_assessment_period ON compliance_score_snapshots (assessment_period);
CREATE INDEX IF NOT EXISTS ix_compliance_score_snapshots_institution_id ON compliance_score_snapshots (institution_id);
CREATE INDEX IF NOT EXISTS ix_compliance_score_snapshots_calculated_at ON compliance_score_snapshots (calculated_at);

-- Table: institution_aliases
CREATE TABLE IF NOT EXISTS institution_aliases (
	id SERIAL NOT NULL, 
	institution_id INTEGER NOT NULL, 
	alias_name VARCHAR(300) NOT NULL, 
	alias_type VARCHAR(50), 
	is_verified BOOLEAN, 
	verification_notes TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id)
);

CREATE INDEX IF NOT EXISTS ix_institution_aliases_alias_name ON institution_aliases (alias_name);
CREATE INDEX IF NOT EXISTS ix_institution_aliases_id ON institution_aliases (id);

-- Table: surge_alerts
CREATE TABLE IF NOT EXISTS surge_alerts (
	id SERIAL NOT NULL, 
	institution_id INTEGER NOT NULL, 
	category VARCHAR(100) NOT NULL, 
	current_count INTEGER NOT NULL, 
	baseline_mean FLOAT NOT NULL, 
	baseline_std FLOAT NOT NULL, 
	z_score FLOAT NOT NULL, 
	time_window_days INTEGER, 
	detection_method VARCHAR(100), 
	status VARCHAR(50), 
	remarks TEXT, 
	detected_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id)
);

CREATE INDEX IF NOT EXISTS ix_surge_alerts_id ON surge_alerts (id);
CREATE INDEX IF NOT EXISTS ix_surge_alerts_institution_id ON surge_alerts (institution_id);
CREATE INDEX IF NOT EXISTS ix_surge_alerts_status ON surge_alerts (status);

-- Table: users
CREATE TABLE IF NOT EXISTS users (
	id SERIAL NOT NULL, 
	username VARCHAR(100) NOT NULL, 
	email VARCHAR(200) NOT NULL, 
	full_name VARCHAR(200) NOT NULL, 
	designation VARCHAR(200), 
	hashed_password VARCHAR(255) NOT NULL, 
	role VARCHAR(50) NOT NULL, 
	bureau_id INTEGER, 
	is_active BOOLEAN, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(bureau_id) REFERENCES bureaus (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);
CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
	id SERIAL NOT NULL, 
	actor_id INTEGER, 
	actor_name VARCHAR(200) NOT NULL, 
	actor_role VARCHAR(50) NOT NULL, 
	event_type VARCHAR(100) NOT NULL, 
	entity_type VARCHAR(100) NOT NULL, 
	entity_id VARCHAR(100) NOT NULL, 
	previous_value TEXT, 
	new_value TEXT, 
	remarks TEXT, 
	ip_address VARCHAR(100), 
	timestamp TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_id ON audit_logs (id);
CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS ix_audit_logs_event_type ON audit_logs (event_type);
CREATE INDEX IF NOT EXISTS ix_audit_logs_entity_id ON audit_logs (entity_id);

-- Table: cases
CREATE TABLE IF NOT EXISTS cases (
	id VARCHAR(100) NOT NULL, 
	institution_id INTEGER NOT NULL, 
	complainant_type VARCHAR(50), 
	complainant_masked VARCHAR(100), 
	title VARCHAR(250), 
	category VARCHAR(100) NOT NULL, 
	subcategory VARCHAR(100), 
	description TEXT NOT NULL, 
	date_received TIMESTAMP WITHOUT TIME ZONE, 
	status VARCHAR(50), 
	current_bureau_id INTEGER NOT NULL, 
	assigned_officer_id INTEGER, 
	complainant_id INTEGER, 
	priority VARCHAR(50), 
	priority_score FLOAT, 
	priority_factors JSON, 
	priority_override_reason TEXT, 
	last_action VARCHAR(300), 
	next_action VARCHAR(300), 
	last_action_date TIMESTAMP WITHOUT TIME ZONE, 
	prescribed_deadline TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	expected_disposal_date TIMESTAMP WITHOUT TIME ZONE, 
	overlap_review_status VARCHAR(50), 
	action_conflict_status VARCHAR(50), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(current_bureau_id) REFERENCES bureaus (id), 
	FOREIGN KEY(assigned_officer_id) REFERENCES users (id), 
	FOREIGN KEY(complainant_id) REFERENCES complainants (id)
);

CREATE INDEX IF NOT EXISTS ix_cases_complainant_id ON cases (complainant_id);
CREATE INDEX IF NOT EXISTS ix_cases_priority ON cases (priority);
CREATE INDEX IF NOT EXISTS ix_cases_category ON cases (category);
CREATE INDEX IF NOT EXISTS ix_cases_current_bureau_id ON cases (current_bureau_id);
CREATE INDEX IF NOT EXISTS ix_cases_date_received ON cases (date_received);
CREATE INDEX IF NOT EXISTS ix_cases_status ON cases (status);
CREATE INDEX IF NOT EXISTS ix_cases_prescribed_deadline ON cases (prescribed_deadline);
CREATE INDEX IF NOT EXISTS ix_cases_institution_id ON cases (institution_id);
CREATE INDEX IF NOT EXISTS ix_cases_assigned_officer_id ON cases (assigned_officer_id);
CREATE INDEX IF NOT EXISTS ix_cases_id ON cases (id);

-- Table: coordination_workspaces
CREATE TABLE IF NOT EXISTS coordination_workspaces (
	id SERIAL NOT NULL, 
	title VARCHAR(250) NOT NULL, 
	institution_id INTEGER NOT NULL, 
	primary_bureau_id INTEGER NOT NULL, 
	secondary_bureau_id INTEGER, 
	coordination_owner_id INTEGER NOT NULL, 
	status VARCHAR(50), 
	justification TEXT, 
	meeting_records JSON, 
	decisions TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(primary_bureau_id) REFERENCES bureaus (id), 
	FOREIGN KEY(secondary_bureau_id) REFERENCES bureaus (id), 
	FOREIGN KEY(coordination_owner_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_coordination_workspaces_status ON coordination_workspaces (status);
CREATE INDEX IF NOT EXISTS ix_coordination_workspaces_id ON coordination_workspaces (id);
CREATE INDEX IF NOT EXISTS ix_coordination_workspaces_institution_id ON coordination_workspaces (institution_id);

-- Table: institutional_risk_indicators
CREATE TABLE IF NOT EXISTS institutional_risk_indicators (
	id SERIAL NOT NULL, 
	institution_id INTEGER NOT NULL, 
	indicator_type VARCHAR(100) NOT NULL, 
	severity VARCHAR(50), 
	title VARCHAR(250) NOT NULL, 
	supporting_evidence JSON NOT NULL, 
	observation_period VARCHAR(100) NOT NULL, 
	calculation_method VARCHAR(100) NOT NULL, 
	data_completeness FLOAT, 
	recommended_review TEXT NOT NULL, 
	status VARCHAR(50), 
	detected_at TIMESTAMP WITHOUT TIME ZONE, 
	reviewed_by_id INTEGER, 
	reviewed_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(reviewed_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_institutional_risk_indicators_id ON institutional_risk_indicators (id);
CREATE INDEX IF NOT EXISTS ix_institutional_risk_indicators_indicator_type ON institutional_risk_indicators (indicator_type);
CREATE INDEX IF NOT EXISTS ix_institutional_risk_indicators_severity ON institutional_risk_indicators (severity);
CREATE INDEX IF NOT EXISTS ix_institutional_risk_indicators_status ON institutional_risk_indicators (status);
CREATE INDEX IF NOT EXISTS ix_institutional_risk_indicators_institution_id ON institutional_risk_indicators (institution_id);

-- Table: notifications
CREATE TABLE IF NOT EXISTS notifications (
	id SERIAL NOT NULL, 
	recipient_id INTEGER, 
	complainant_id INTEGER, 
	notification_type VARCHAR(100) NOT NULL, 
	related_case_id VARCHAR(100), 
	related_entity_type VARCHAR(50), 
	related_entity_id VARCHAR(100), 
	title VARCHAR(200) NOT NULL, 
	message TEXT NOT NULL, 
	severity VARCHAR(50), 
	is_read BOOLEAN, 
	resolution_state VARCHAR(50), 
	link_url VARCHAR(300), 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(recipient_id) REFERENCES users (id), 
	FOREIGN KEY(complainant_id) REFERENCES complainants (id)
);

CREATE INDEX IF NOT EXISTS ix_notifications_complainant_id ON notifications (complainant_id);
CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications (created_at);
CREATE INDEX IF NOT EXISTS ix_notifications_recipient_id ON notifications (recipient_id);
CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications (is_read);
CREATE INDEX IF NOT EXISTS ix_notifications_notification_type ON notifications (notification_type);
CREATE INDEX IF NOT EXISTS ix_notifications_id ON notifications (id);

-- Table: regulatory_requirements
CREATE TABLE IF NOT EXISTS regulatory_requirements (
	id VARCHAR(50) NOT NULL, 
	title VARCHAR(250) NOT NULL, 
	description TEXT NOT NULL, 
	category_code VARCHAR(50), 
	regulatory_source VARCHAR(250) NOT NULL, 
	source_reference_url VARCHAR(500), 
	applicable_institution_types JSON NOT NULL, 
	applicability_conditions JSON, 
	weight FLOAT, 
	default_evidence_requirements JSON, 
	responsible_bureau_id INTEGER NOT NULL, 
	effective_date TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	review_date TIMESTAMP WITHOUT TIME ZONE, 
	version INTEGER, 
	is_active BOOLEAN, 
	created_by_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(responsible_bureau_id) REFERENCES bureaus (id), 
	FOREIGN KEY(created_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_regulatory_requirements_is_active ON regulatory_requirements (is_active);
CREATE INDEX IF NOT EXISTS ix_regulatory_requirements_responsible_bureau_id ON regulatory_requirements (responsible_bureau_id);
CREATE INDEX IF NOT EXISTS ix_regulatory_requirements_id ON regulatory_requirements (id);
CREATE INDEX IF NOT EXISTS ix_regulatory_requirements_created_at ON regulatory_requirements (created_at);

-- Table: system_configurations
CREATE TABLE IF NOT EXISTS system_configurations (
	id SERIAL NOT NULL, 
	config_key VARCHAR(100) NOT NULL, 
	config_value VARCHAR(500) NOT NULL, 
	description TEXT, 
	updated_by_id INTEGER, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(updated_by_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_system_configurations_config_key ON system_configurations (config_key);
CREATE INDEX IF NOT EXISTS ix_system_configurations_id ON system_configurations (id);

-- Table: action_conflict_alerts
CREATE TABLE IF NOT EXISTS action_conflict_alerts (
	id SERIAL NOT NULL, 
	case_a_id VARCHAR(100) NOT NULL, 
	case_b_id VARCHAR(100) NOT NULL, 
	institution_id INTEGER NOT NULL, 
	conflict_type VARCHAR(100) NOT NULL, 
	rule_triggered VARCHAR(200) NOT NULL, 
	severity VARCHAR(50), 
	evidence JSON, 
	status VARCHAR(50), 
	reviewer_id INTEGER, 
	resolution_notes TEXT, 
	reconciled_action TEXT, 
	coordination_workspace_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_a_id) REFERENCES cases (id), 
	FOREIGN KEY(case_b_id) REFERENCES cases (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(reviewer_id) REFERENCES users (id), 
	FOREIGN KEY(coordination_workspace_id) REFERENCES coordination_workspaces (id)
);

CREATE INDEX IF NOT EXISTS ix_action_conflict_alerts_institution_id ON action_conflict_alerts (institution_id);
CREATE INDEX IF NOT EXISTS ix_action_conflict_alerts_severity ON action_conflict_alerts (severity);
CREATE INDEX IF NOT EXISTS ix_action_conflict_alerts_case_a_id ON action_conflict_alerts (case_a_id);
CREATE INDEX IF NOT EXISTS ix_action_conflict_alerts_status ON action_conflict_alerts (status);
CREATE INDEX IF NOT EXISTS ix_action_conflict_alerts_case_b_id ON action_conflict_alerts (case_b_id);
CREATE INDEX IF NOT EXISTS ix_action_conflict_alerts_id ON action_conflict_alerts (id);

-- Table: ai_duplicate_recommendations
CREATE TABLE IF NOT EXISTS ai_duplicate_recommendations (
	id SERIAL NOT NULL, 
	source_case_id VARCHAR(100) NOT NULL, 
	candidate_case_id VARCHAR(100) NOT NULL, 
	institution_id INTEGER NOT NULL, 
	similarity_score FLOAT NOT NULL, 
	duplicate_probability FLOAT NOT NULL, 
	predicted_tier VARCHAR(50) NOT NULL, 
	is_duplicate_predicted BOOLEAN, 
	features JSON, 
	explanation TEXT, 
	statutory_advice TEXT, 
	model_version VARCHAR(100), 
	verification_status VARCHAR(50), 
	verified_by_id INTEGER, 
	verification_reason TEXT, 
	verified_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(source_case_id) REFERENCES cases (id), 
	FOREIGN KEY(candidate_case_id) REFERENCES cases (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(verified_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_ai_duplicate_recommendations_source_case_id ON ai_duplicate_recommendations (source_case_id);
CREATE INDEX IF NOT EXISTS ix_ai_duplicate_recommendations_candidate_case_id ON ai_duplicate_recommendations (candidate_case_id);
CREATE INDEX IF NOT EXISTS ix_ai_duplicate_recommendations_created_at ON ai_duplicate_recommendations (created_at);
CREATE INDEX IF NOT EXISTS ix_ai_duplicate_recommendations_institution_id ON ai_duplicate_recommendations (institution_id);
CREATE INDEX IF NOT EXISTS ix_ai_duplicate_recommendations_verification_status ON ai_duplicate_recommendations (verification_status);
CREATE INDEX IF NOT EXISTS ix_ai_duplicate_recommendations_id ON ai_duplicate_recommendations (id);

-- Table: case_assignments
CREATE TABLE IF NOT EXISTS case_assignments (
	id SERIAL NOT NULL, 
	case_id VARCHAR(100) NOT NULL, 
	from_officer_id INTEGER, 
	to_officer_id INTEGER NOT NULL, 
	assigned_by_id INTEGER NOT NULL, 
	bureau_id INTEGER NOT NULL, 
	remarks TEXT, 
	assigned_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_id) REFERENCES cases (id), 
	FOREIGN KEY(from_officer_id) REFERENCES users (id), 
	FOREIGN KEY(to_officer_id) REFERENCES users (id), 
	FOREIGN KEY(assigned_by_id) REFERENCES users (id), 
	FOREIGN KEY(bureau_id) REFERENCES bureaus (id)
);

CREATE INDEX IF NOT EXISTS ix_case_assignments_case_id ON case_assignments (case_id);
CREATE INDEX IF NOT EXISTS ix_case_assignments_to_officer_id ON case_assignments (to_officer_id);
CREATE INDEX IF NOT EXISTS ix_case_assignments_id ON case_assignments (id);
CREATE INDEX IF NOT EXISTS ix_case_assignments_assigned_at ON case_assignments (assigned_at);

-- Table: case_coordination_links
CREATE TABLE IF NOT EXISTS case_coordination_links (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	case_id VARCHAR(100) NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(workspace_id) REFERENCES coordination_workspaces (id), 
	FOREIGN KEY(case_id) REFERENCES cases (id)
);

CREATE INDEX IF NOT EXISTS ix_case_coordination_links_id ON case_coordination_links (id);
CREATE INDEX IF NOT EXISTS ix_case_coordination_links_case_id ON case_coordination_links (case_id);
CREATE INDEX IF NOT EXISTS ix_case_coordination_links_workspace_id ON case_coordination_links (workspace_id);

-- Table: case_events
CREATE TABLE IF NOT EXISTS case_events (
	id SERIAL NOT NULL, 
	case_id VARCHAR(100) NOT NULL, 
	event_type VARCHAR(100) NOT NULL, 
	actor_id INTEGER, 
	actor_name VARCHAR(200) NOT NULL, 
	previous_value TEXT, 
	new_value TEXT, 
	remarks TEXT, 
	is_public BOOLEAN, 
	document_ref VARCHAR(300), 
	timestamp TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_id) REFERENCES cases (id), 
	FOREIGN KEY(actor_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_case_events_id ON case_events (id);
CREATE INDEX IF NOT EXISTS ix_case_events_timestamp ON case_events (timestamp);
CREATE INDEX IF NOT EXISTS ix_case_events_case_id ON case_events (case_id);

-- Table: case_relationships
CREATE TABLE IF NOT EXISTS case_relationships (
	id SERIAL NOT NULL, 
	case_a_id VARCHAR(100) NOT NULL, 
	case_b_id VARCHAR(100) NOT NULL, 
	relationship_type VARCHAR(100), 
	status VARCHAR(50), 
	similarity_score FLOAT, 
	evidence JSON, 
	reviewer_id INTEGER, 
	review_decision VARCHAR(100), 
	review_remarks TEXT, 
	decided_at TIMESTAMP WITHOUT TIME ZONE, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_a_id) REFERENCES cases (id), 
	FOREIGN KEY(case_b_id) REFERENCES cases (id), 
	FOREIGN KEY(reviewer_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_case_relationships_id ON case_relationships (id);

-- Table: compliance_assessments
CREATE TABLE IF NOT EXISTS compliance_assessments (
	id SERIAL NOT NULL, 
	institution_id INTEGER NOT NULL, 
	requirement_id VARCHAR(50) NOT NULL, 
	requirement_version INTEGER, 
	assessment_period VARCHAR(50) NOT NULL, 
	status VARCHAR(50), 
	score_contribution FLOAT, 
	reviewer_id INTEGER, 
	reviewer_remarks TEXT, 
	assessed_at TIMESTAMP WITHOUT TIME ZONE, 
	decision_history JSON, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(requirement_id) REFERENCES regulatory_requirements (id), 
	FOREIGN KEY(reviewer_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_compliance_assessments_assessment_period ON compliance_assessments (assessment_period);
CREATE INDEX IF NOT EXISTS ix_compliance_assessments_institution_id ON compliance_assessments (institution_id);
CREATE INDEX IF NOT EXISTS ix_compliance_assessments_requirement_id ON compliance_assessments (requirement_id);
CREATE INDEX IF NOT EXISTS ix_compliance_assessments_id ON compliance_assessments (id);
CREATE INDEX IF NOT EXISTS ix_compliance_assessments_status ON compliance_assessments (status);
CREATE INDEX IF NOT EXISTS ix_compliance_assessments_created_at ON compliance_assessments (created_at);

-- Table: coordination_participants
CREATE TABLE IF NOT EXISTS coordination_participants (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	officer_id INTEGER NOT NULL, 
	bureau_id INTEGER NOT NULL, 
	role VARCHAR(100), 
	joined_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(workspace_id) REFERENCES coordination_workspaces (id), 
	FOREIGN KEY(officer_id) REFERENCES users (id), 
	FOREIGN KEY(bureau_id) REFERENCES bureaus (id)
);

CREATE INDEX IF NOT EXISTS ix_coordination_participants_id ON coordination_participants (id);

-- Table: document_metadata
CREATE TABLE IF NOT EXISTS document_metadata (
	id SERIAL NOT NULL, 
	case_id VARCHAR(100) NOT NULL, 
	file_name VARCHAR(255) NOT NULL, 
	original_filename VARCHAR(255), 
	file_size INTEGER NOT NULL, 
	file_type VARCHAR(50) NOT NULL, 
	category VARCHAR(100), 
	access_classification VARCHAR(50), 
	uploaded_by_id INTEGER, 
	uploaded_by_complainant_id INTEGER, 
	uploader_role VARCHAR(50), 
	file_path VARCHAR(500) NOT NULL, 
	upload_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_id) REFERENCES cases (id), 
	FOREIGN KEY(uploaded_by_id) REFERENCES users (id), 
	FOREIGN KEY(uploaded_by_complainant_id) REFERENCES complainants (id)
);

CREATE INDEX IF NOT EXISTS ix_document_metadata_uploaded_by_complainant_id ON document_metadata (uploaded_by_complainant_id);
CREATE INDEX IF NOT EXISTS ix_document_metadata_case_id ON document_metadata (case_id);
CREATE INDEX IF NOT EXISTS ix_document_metadata_id ON document_metadata (id);

-- Table: overlap_alerts
CREATE TABLE IF NOT EXISTS overlap_alerts (
	id SERIAL NOT NULL, 
	case_a_id VARCHAR(100) NOT NULL, 
	case_b_id VARCHAR(100) NOT NULL, 
	institution_id INTEGER NOT NULL, 
	similarity_score FLOAT NOT NULL, 
	model_name VARCHAR(100), 
	evidence_summary JSON, 
	review_status VARCHAR(50), 
	reviewer_id INTEGER, 
	review_notes TEXT, 
	decision VARCHAR(50), 
	coordination_workspace_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_a_id) REFERENCES cases (id), 
	FOREIGN KEY(case_b_id) REFERENCES cases (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(reviewer_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_overlap_alerts_case_b_id ON overlap_alerts (case_b_id);
CREATE INDEX IF NOT EXISTS ix_overlap_alerts_review_status ON overlap_alerts (review_status);
CREATE INDEX IF NOT EXISTS ix_overlap_alerts_case_a_id ON overlap_alerts (case_a_id);
CREATE INDEX IF NOT EXISTS ix_overlap_alerts_institution_id ON overlap_alerts (institution_id);
CREATE INDEX IF NOT EXISTS ix_overlap_alerts_id ON overlap_alerts (id);

-- Table: priority_evaluations
CREATE TABLE IF NOT EXISTS priority_evaluations (
	id SERIAL NOT NULL, 
	case_id VARCHAR(100) NOT NULL, 
	calculated_priority VARCHAR(50) NOT NULL, 
	calculated_score FLOAT NOT NULL, 
	factors JSON NOT NULL, 
	is_overridden BOOLEAN, 
	override_priority VARCHAR(50), 
	override_reason TEXT, 
	evaluator_id INTEGER, 
	evaluated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(case_id) REFERENCES cases (id), 
	FOREIGN KEY(evaluator_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_priority_evaluations_case_id ON priority_evaluations (case_id);
CREATE INDEX IF NOT EXISTS ix_priority_evaluations_id ON priority_evaluations (id);

-- Table: regulatory_requirement_versions
CREATE TABLE IF NOT EXISTS regulatory_requirement_versions (
	id SERIAL NOT NULL, 
	requirement_id VARCHAR(50) NOT NULL, 
	version_number INTEGER NOT NULL, 
	title VARCHAR(250) NOT NULL, 
	description TEXT NOT NULL, 
	weight FLOAT NOT NULL, 
	regulatory_source VARCHAR(250) NOT NULL, 
	changes_summary TEXT NOT NULL, 
	promulgated_by_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(requirement_id) REFERENCES regulatory_requirements (id), 
	FOREIGN KEY(promulgated_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_regulatory_requirement_versions_id ON regulatory_requirement_versions (id);
CREATE INDEX IF NOT EXISTS ix_regulatory_requirement_versions_requirement_id ON regulatory_requirement_versions (requirement_id);
CREATE INDEX IF NOT EXISTS ix_regulatory_requirement_versions_created_at ON regulatory_requirement_versions (created_at);

-- Table: compliance_evidences
CREATE TABLE IF NOT EXISTS compliance_evidences (
	id SERIAL NOT NULL, 
	assessment_id INTEGER NOT NULL, 
	institution_id INTEGER NOT NULL, 
	document_id INTEGER NOT NULL, 
	evidence_type VARCHAR(100) NOT NULL, 
	verification_status VARCHAR(50), 
	verified_by_id INTEGER, 
	verification_remarks TEXT, 
	rejection_reason TEXT, 
	submitted_by_role VARCHAR(50), 
	submitted_by_id INTEGER, 
	submitted_at TIMESTAMP WITHOUT TIME ZONE, 
	verified_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(assessment_id) REFERENCES compliance_assessments (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(document_id) REFERENCES document_metadata (id), 
	FOREIGN KEY(verified_by_id) REFERENCES users (id), 
	FOREIGN KEY(submitted_by_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_compliance_evidences_verification_status ON compliance_evidences (verification_status);
CREATE INDEX IF NOT EXISTS ix_compliance_evidences_institution_id ON compliance_evidences (institution_id);
CREATE INDEX IF NOT EXISTS ix_compliance_evidences_id ON compliance_evidences (id);
CREATE INDEX IF NOT EXISTS ix_compliance_evidences_document_id ON compliance_evidences (document_id);
CREATE INDEX IF NOT EXISTS ix_compliance_evidences_assessment_id ON compliance_evidences (assessment_id);

-- Table: coordination_tasks
CREATE TABLE IF NOT EXISTS coordination_tasks (
	id SERIAL NOT NULL, 
	workspace_id INTEGER NOT NULL, 
	title VARCHAR(250) NOT NULL, 
	description TEXT, 
	assigned_to_id INTEGER NOT NULL, 
	bureau_id INTEGER NOT NULL, 
	due_date TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	priority VARCHAR(50), 
	status VARCHAR(50), 
	remarks TEXT, 
	depends_on_task_id INTEGER, 
	evidence_doc_id INTEGER, 
	created_at TIMESTAMP WITHOUT TIME ZONE, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(workspace_id) REFERENCES coordination_workspaces (id), 
	FOREIGN KEY(assigned_to_id) REFERENCES users (id), 
	FOREIGN KEY(bureau_id) REFERENCES bureaus (id), 
	FOREIGN KEY(depends_on_task_id) REFERENCES coordination_tasks (id), 
	FOREIGN KEY(evidence_doc_id) REFERENCES document_metadata (id)
);

CREATE INDEX IF NOT EXISTS ix_coordination_tasks_id ON coordination_tasks (id);

-- Table: corrective_action_plans
CREATE TABLE IF NOT EXISTS corrective_action_plans (
	id SERIAL NOT NULL, 
	institution_id INTEGER NOT NULL, 
	assessment_id INTEGER, 
	related_case_id VARCHAR(100), 
	title VARCHAR(250) NOT NULL, 
	identified_gap TEXT NOT NULL, 
	required_action TEXT NOT NULL, 
	responsible_bureau_id INTEGER NOT NULL, 
	assigned_officer_id INTEGER NOT NULL, 
	priority VARCHAR(50), 
	status VARCHAR(50), 
	prescribed_deadline TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	completion_evidence_doc_id INTEGER, 
	verification_officer_id INTEGER, 
	verification_remarks TEXT, 
	closure_decision TEXT, 
	closed_at TIMESTAMP WITHOUT TIME ZONE, 
	reopen_reason TEXT, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITHOUT TIME ZONE, 
	PRIMARY KEY (id), 
	FOREIGN KEY(institution_id) REFERENCES institutions (id), 
	FOREIGN KEY(assessment_id) REFERENCES compliance_assessments (id), 
	FOREIGN KEY(related_case_id) REFERENCES cases (id), 
	FOREIGN KEY(responsible_bureau_id) REFERENCES bureaus (id), 
	FOREIGN KEY(assigned_officer_id) REFERENCES users (id), 
	FOREIGN KEY(completion_evidence_doc_id) REFERENCES document_metadata (id), 
	FOREIGN KEY(verification_officer_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_assessment_id ON corrective_action_plans (assessment_id);
CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_institution_id ON corrective_action_plans (institution_id);
CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_prescribed_deadline ON corrective_action_plans (prescribed_deadline);
CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_status ON corrective_action_plans (status);
CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_related_case_id ON corrective_action_plans (related_case_id);
CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_created_at ON corrective_action_plans (created_at);
CREATE INDEX IF NOT EXISTS ix_corrective_action_plans_id ON corrective_action_plans (id);

-- Table: document_binaries
CREATE TABLE IF NOT EXISTS document_binaries (
	id SERIAL NOT NULL, 
	document_id INTEGER NOT NULL, 
	content BYTEA NOT NULL, 
	sha256_checksum VARCHAR(64) NOT NULL, 
	file_size_bytes INTEGER NOT NULL, 
	created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(document_id) REFERENCES document_metadata (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS ix_document_binaries_id ON document_binaries (id);
CREATE INDEX IF NOT EXISTS ix_document_binaries_created_at ON document_binaries (created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ix_document_binaries_document_id ON document_binaries (document_id);

-- ============================================================================
-- Phase 8 Multi-Column Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS ix_comp_assess_inst_req_period ON compliance_assessments (institution_id, requirement_id, assessment_period);
CREATE INDEX IF NOT EXISTS ix_cap_inst_status_deadline ON corrective_action_plans (institution_id, status, prescribed_deadline);
CREATE INDEX IF NOT EXISTS ix_risk_ind_inst_severity ON institutional_risk_indicators (institution_id, severity, status);
CREATE INDEX IF NOT EXISTS ix_comp_snap_inst_period ON compliance_score_snapshots (institution_id, assessment_period);
