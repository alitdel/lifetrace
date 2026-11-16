-- ====================================================================
-- LifeTrace Database Schema
-- MySQL 8.0 Compatible
-- Database: lifetrace_db
-- ====================================================================

CREATE DATABASE IF NOT EXISTS `lifetrace_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `lifetrace_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('expert', 'learner', 'reviewer', 'admin') NOT NULL DEFAULT 'learner',
  `full_name` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `status` ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
  `avatar_url` VARCHAR(255) NULL,
  `last_login` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Expert Profiles
CREATE TABLE IF NOT EXISTS `expert_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `bio` TEXT NULL,
  `areas_of_expertise` VARCHAR(255) NOT NULL,
  `experience_years` INT UNSIGNED DEFAULT 1,
  `organization_or_trade` VARCHAR(150) NULL,
  `location` VARCHAR(120) NOT NULL DEFAULT 'Uganda',
  `contact_email` VARCHAR(100) NULL,
  `contact_phone` VARCHAR(30) NULL,
  `public_profile_visible` TINYINT(1) NOT NULL DEFAULT 1,
  `verified_expert` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_expert_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Learner Profiles
CREATE TABLE IF NOT EXISTS `learner_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `bio` TEXT NULL,
  `education_level` VARCHAR(80) NULL,
  `primary_interest` VARCHAR(150) NULL,
  `location` VARCHAR(120) NOT NULL DEFAULT 'Uganda',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_learner_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Knowledge Categories
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `icon` VARCHAR(60) NOT NULL DEFAULT 'fa-tools',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_cat_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Knowledge Records (Core knowledge entity)
CREATE TABLE IF NOT EXISTS `knowledge_records` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `expert_id` INT UNSIGNED NOT NULL,
  `category_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `local_name` VARCHAR(200) NULL,
  `community_region` VARCHAR(150) NULL,
  `slug` VARCHAR(220) NOT NULL UNIQUE,
  `short_summary` VARCHAR(500) NOT NULL,
  `detailed_description` MEDIUMTEXT NOT NULL,
  `cultural_background` MEDIUMTEXT NULL,
  `estimated_time_minutes` INT UNSIGNED NOT NULL DEFAULT 30,
  `skill_level` ENUM('beginner', 'intermediate', 'advanced', 'all_levels') NOT NULL DEFAULT 'beginner',
  `preparation_instructions` TEXT NULL,
  `material_sourcing` TEXT NULL,
  `safety_precautions` TEXT NOT NULL,
  `common_mistakes` TEXT NULL,
  `mistake_solutions` TEXT NULL,
  `troubleshooting` TEXT NULL,
  `expected_results` TEXT NOT NULL,
  `references_sources` TEXT NULL,
  `attribution_consent` TEXT NULL,
  `cover_image_url` VARCHAR(255) NULL,
  `demo_video_url` VARCHAR(255) NULL,
  `status` ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected', 'published') NOT NULL DEFAULT 'draft',
  `rejection_reason` TEXT NULL,
  `review_comments` TEXT NULL,
  `reviewer_id` INT UNSIGNED NULL,
  `approved_at` DATETIME NULL,
  `published_at` DATETIME NULL,
  `view_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_knowledge_expert` FOREIGN KEY (`expert_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_knowledge_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_knowledge_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_knowledge_status` (`status`),
  INDEX `idx_knowledge_category` (`category_id`),
  INDEX `idx_knowledge_skill` (`skill_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Knowledge Steps
CREATE TABLE IF NOT EXISTS `knowledge_steps` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `step_number` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `instruction` TEXT NOT NULL,
  `safety_warning` TEXT NULL,
  `tip` TEXT NULL,
  `image_url` VARCHAR(255) NULL,
  `video_url` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_step_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  INDEX `idx_step_order` (`knowledge_id`, `step_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Knowledge Tools Required
CREATE TABLE IF NOT EXISTS `knowledge_tools` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `local_name` VARCHAR(150) NULL,
  `specification` VARCHAR(200) NULL,
  `optional` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tool_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Knowledge Materials Required
CREATE TABLE IF NOT EXISTS `knowledge_materials` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `local_name` VARCHAR(150) NULL,
  `quantity` VARCHAR(80) NOT NULL,
  `unit` VARCHAR(50) NULL,
  `source_location` VARCHAR(200) NULL,
  `optional` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_mat_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Knowledge Media Attachments
CREATE TABLE IF NOT EXISTS `knowledge_media` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `media_type` ENUM('image', 'video', 'document') NOT NULL DEFAULT 'image',
  `file_path` VARCHAR(255) NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `file_size` INT UNSIGNED NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `caption` VARCHAR(255) NULL,
  `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_media_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Knowledge Visibility and Preferences
CREATE TABLE IF NOT EXISTS `knowledge_visibility` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL UNIQUE,
  `visibility_level` ENUM('public', 'registered_learners', 'restricted', 'private') NOT NULL DEFAULT 'public',
  `allow_comments` TINYINT(1) NOT NULL DEFAULT 1,
  `allow_assessments` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_vis_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Reviews (Formal Review Decision Records)
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `reviewer_id` INT UNSIGNED NOT NULL,
  `decision` ENUM('approved', 'rejected', 'correction_requested', 'under_review') NOT NULL,
  `completeness_score` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `clarity_score` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `safety_score` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `comments` TEXT NOT NULL,
  `internal_notes` TEXT NULL,
  `reviewed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_review_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Review History Log
CREATE TABLE IF NOT EXISTS `review_history` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `reviewer_id` INT UNSIGNED NULL,
  `previous_status` VARCHAR(50) NOT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `feedback_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rh_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rh_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Bookmarks (Learner Saved Records)
CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_bookmark` (`user_id`, `knowledge_id`),
  CONSTRAINT `fk_bm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bm_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Learning Activities
CREATE TABLE IF NOT EXISTS `learning_activities` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `objectives` TEXT NOT NULL,
  `instructions` TEXT NOT NULL,
  `estimated_duration` VARCHAR(50) NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_la_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_la_author` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Learning Progress (Enrollments & Status)
CREATE TABLE IF NOT EXISTS `learning_progress` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `learner_id` INT UNSIGNED NOT NULL,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `status` ENUM('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
  `current_step` INT UNSIGNED NOT NULL DEFAULT 1,
  `completed_steps_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_steps_count` INT UNSIGNED NOT NULL DEFAULT 1,
  `completion_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  `last_accessed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_learner_knowledge` (`learner_id`, `knowledge_id`),
  CONSTRAINT `fk_lp_learner` FOREIGN KEY (`learner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lp_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Learning Step Completions
CREATE TABLE IF NOT EXISTS `learning_step_completions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `progress_id` INT UNSIGNED NOT NULL,
  `step_id` INT UNSIGNED NOT NULL,
  `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_progress_step` (`progress_id`, `step_id`),
  CONSTRAINT `fk_lsc_progress` FOREIGN KEY (`progress_id`) REFERENCES `learning_progress` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_lsc_step` FOREIGN KEY (`step_id`) REFERENCES `knowledge_steps` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Practical Submissions (Learner Evidence)
CREATE TABLE IF NOT EXISTS `practical_submissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `learner_id` INT UNSIGNED NOT NULL,
  `submission_title` VARCHAR(200) NOT NULL,
  `submission_text` TEXT NOT NULL,
  `file_url` VARCHAR(255) NULL,
  `original_filename` VARCHAR(255) NULL,
  `file_size` INT UNSIGNED NULL,
  `mime_type` VARCHAR(100) NULL,
  `status` ENUM('submitted', 'under_evaluation', 'passed', 'needs_revision', 'failed') NOT NULL DEFAULT 'submitted',
  `grade_score` DECIMAL(5,2) NULL,
  `assessor_feedback` TEXT NULL,
  `assessor_id` INT UNSIGNED NULL,
  `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `evaluated_at` DATETIME NULL,
  CONSTRAINT `fk_ps_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_learner` FOREIGN KEY (`learner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ps_assessor` FOREIGN KEY (`assessor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Assessments (Formal Knowledge Test)
CREATE TABLE IF NOT EXISTS `assessments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL UNIQUE,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `passing_score` INT UNSIGNED NOT NULL DEFAULT 75,
  `max_attempts` INT UNSIGNED NOT NULL DEFAULT 3,
  `time_limit_minutes` INT UNSIGNED NOT NULL DEFAULT 20,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_as_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_as_author` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Assessment Questions
CREATE TABLE IF NOT EXISTS `assessment_questions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `assessment_id` INT UNSIGNED NOT NULL,
  `question_text` TEXT NOT NULL,
  `question_type` ENUM('multiple_choice', 'true_false', 'short_answer') NOT NULL DEFAULT 'multiple_choice',
  `options_json` JSON NOT NULL,
  `correct_answer` VARCHAR(255) NOT NULL,
  `explanation` TEXT NULL,
  `points` INT UNSIGNED NOT NULL DEFAULT 10,
  `display_order` INT NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_aq_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Assessment Results
CREATE TABLE IF NOT EXISTS `assessment_results` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `assessment_id` INT UNSIGNED NOT NULL,
  `learner_id` INT UNSIGNED NOT NULL,
  `score` INT NOT NULL,
  `total_points` INT NOT NULL,
  `percentage` DECIMAL(5,2) NOT NULL,
  `passed` TINYINT(1) NOT NULL DEFAULT 0,
  `answers_json` JSON NULL,
  `attempt_number` INT UNSIGNED NOT NULL DEFAULT 1,
  `completed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ar_assessment` FOREIGN KEY (`assessment_id`) REFERENCES `assessments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ar_learner` FOREIGN KEY (`learner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Certificates
CREATE TABLE IF NOT EXISTS `certificates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `certificate_code` VARCHAR(64) NOT NULL UNIQUE,
  `learner_id` INT UNSIGNED NOT NULL,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `assessment_result_id` INT UNSIGNED NULL,
  `issue_date` DATE NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `learner_name` VARCHAR(150) NOT NULL,
  `issuer_name` VARCHAR(150) NOT NULL DEFAULT 'LifeTrace Knowledge Verification Council',
  `status` ENUM('valid', 'revoked') NOT NULL DEFAULT 'valid',
  `verification_url` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_learner_knowledge_cert` (`learner_id`, `knowledge_id`),
  CONSTRAINT `fk_cert_learner` FOREIGN KEY (`learner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cert_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cert_ar` FOREIGN KEY (`assessment_result_id`) REFERENCES `assessment_results` (`id`) ON DELETE SET NULL,
  INDEX `idx_cert_code` (`certificate_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. In-App Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'success', 'warning', 'action_required') NOT NULL DEFAULT 'info',
  `link` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Immutable Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `username` VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  `role` VARCHAR(30) NOT NULL DEFAULT 'ANONYMOUS',
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(60) NOT NULL,
  `record_id` VARCHAR(50) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `details_json` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_time` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. System Settings
CREATE TABLE IF NOT EXISTS `system_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(80) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_by` INT UNSIGNED NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_setting_user` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Reviewer Profiles
CREATE TABLE IF NOT EXISTS `reviewer_profiles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `qualification` VARCHAR(255) NOT NULL,
  `specialization_domains` VARCHAR(255) NOT NULL,
  `institution_or_guild` VARCHAR(150) NULL,
  `assigned_reviews_count` INT UNSIGNED DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_rp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Knowledge Access Grants (Restricted & Community Knowledge Governance)
CREATE TABLE IF NOT EXISTS `knowledge_access_grants` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `granted_by` INT UNSIGNED NOT NULL,
  `access_type` ENUM('read', 'review', 'learn') NOT NULL DEFAULT 'read',
  `granted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_kag_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kag_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kag_granter` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. Knowledge References & Cultural Citations
CREATE TABLE IF NOT EXISTS `knowledge_references` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `author_or_source` VARCHAR(200) NOT NULL,
  `reference_url` VARCHAR(255) NULL,
  `year_or_context` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_kref_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. Knowledge Review Assignments
CREATE TABLE IF NOT EXISTS `knowledge_review_assignments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `knowledge_id` INT UNSIGNED NOT NULL,
  `reviewer_id` INT UNSIGNED NOT NULL,
  `assigned_by` INT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'completed', 'declined') NOT NULL DEFAULT 'pending',
  `due_date` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_kra_knowledge` FOREIGN KEY (`knowledge_id`) REFERENCES `knowledge_records` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kra_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_kra_assigner` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 29. Practical Submission Evidence (Learner Craft Photography & Video Verification)
CREATE TABLE IF NOT EXISTS `submission_evidence` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT UNSIGNED NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `original_filename` VARCHAR(255) NOT NULL,
  `evidence_type` ENUM('photo', 'video', 'document') NOT NULL DEFAULT 'photo',
  `step_number` INT UNSIGNED NULL,
  `caption` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_se_submission` FOREIGN KEY (`submission_id`) REFERENCES `practical_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

