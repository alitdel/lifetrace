const db = require('../config/db');
const AuditService = require('../services/auditService');
const NotificationService = require('../services/notificationService');

class KnowledgeController {
  /**
   * Public Library: Get Approved & Published Knowledge Records
   */
  static async getLibrary(req, res, next) {
    try {
      const {
        search,
        category,
        skill_level,
        sort = 'newest',
        page = 1,
        limit = 12
      } = req.query;

      const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
      const params = [];

      let whereClause = "WHERE k.status = 'published'";

      // The public library and featured lists never include private or restricted records.
      const user = req.session && req.session.user ? req.session.user : null;
      if (user && user.role === 'learner') {
        whereClause += " AND (kv.visibility_level IN ('public', 'registered_learners') OR kv.visibility_level IS NULL)";
      } else {
        whereClause += " AND (kv.visibility_level = 'public' OR kv.visibility_level IS NULL)";
      }

      if (search && search.trim()) {
        const queryTerm = `%${search.trim()}%`;
        whereClause += " AND (k.title LIKE ? OR k.short_summary LIKE ? OR k.detailed_description LIKE ?)";
        params.push(queryTerm, queryTerm, queryTerm);
      }

      if (category && category !== 'all') {
        whereClause += " AND (c.slug = ? OR c.id = ?)";
        params.push(category, category);
      }

      if (skill_level && skill_level !== 'all') {
        whereClause += " AND k.skill_level = ?";
        params.push(skill_level);
      }

      let orderClause = 'ORDER BY k.published_at DESC';
      if (sort === 'popular') orderClause = 'ORDER BY k.view_count DESC, k.published_at DESC';
      if (sort === 'title') orderClause = 'ORDER BY k.title ASC';
      if (sort === 'fastest') orderClause = 'ORDER BY k.estimated_time_minutes ASC';

      // Count query
      const countSql = `
        SELECT COUNT(DISTINCT k.id) as total
        FROM knowledge_records k
        JOIN categories c ON k.category_id = c.id
        LEFT JOIN knowledge_visibility kv ON k.id = kv.knowledge_id
        ${whereClause}
      `;
      const [countRows] = await db.query(countSql, params);
      const total = countRows[0] ? countRows[0].total : 0;

      // Data query
      const dataSql = `
        SELECT k.id, k.title, k.local_name, k.community_region, k.slug, k.short_summary, k.estimated_time_minutes,
               k.skill_level, k.cover_image_url, k.demo_video_url, k.published_at, k.view_count, k.is_featured,
               c.id as category_id, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
               u.id as expert_id,
               CASE WHEN ep.public_profile_visible = 1 THEN u.full_name ELSE 'LifeTrace Contributor' END as expert_name,
               CASE WHEN ep.public_profile_visible = 1 THEN u.avatar_url ELSE NULL END as expert_avatar,
               CASE WHEN ep.public_profile_visible = 1 THEN ep.organization_or_trade ELSE NULL END as expert_org,
               (SELECT COUNT(*) FROM knowledge_steps WHERE knowledge_id = k.id) as steps_count
        FROM knowledge_records k
        JOIN categories c ON k.category_id = c.id
        JOIN users u ON k.expert_id = u.id
        LEFT JOIN expert_profiles ep ON u.id = ep.user_id
        LEFT JOIN knowledge_visibility kv ON k.id = kv.knowledge_id
        ${whereClause}
        ${orderClause}
        LIMIT ? OFFSET ?
      `;

      const [records] = await db.query(dataSql, [...params, parseInt(limit, 10), offset]);

      // If learner logged in, attach bookmark flags
      if (user) {
        const [bookmarks] = await db.query('SELECT knowledge_id FROM bookmarks WHERE user_id = ?', [user.id]);
        const bookmarkedIds = new Set(bookmarks.map(b => b.knowledge_id));
        records.forEach(r => {
          r.is_bookmarked = bookmarkedIds.has(r.id);
        });
      }

      res.json({
        success: true,
        records,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Featured Knowledge for Landing Page
   */
  static async getFeatured(req, res, next) {
    try {
      const [records] = await db.query(
        `SELECT k.id, k.title, k.local_name, k.community_region, k.slug, k.short_summary, k.estimated_time_minutes,
                k.skill_level, k.cover_image_url, k.demo_video_url, k.published_at, k.view_count,
                c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                CASE WHEN ep.public_profile_visible = 1 THEN u.full_name ELSE 'LifeTrace Contributor' END as expert_name,
                CASE WHEN ep.public_profile_visible = 1 THEN u.avatar_url ELSE NULL END as expert_avatar,
                (SELECT COUNT(*) FROM knowledge_steps WHERE knowledge_id = k.id) as steps_count
         FROM knowledge_records k
         JOIN categories c ON k.category_id = c.id
         JOIN users u ON k.expert_id = u.id
         LEFT JOIN expert_profiles ep ON u.id = ep.user_id
         LEFT JOIN knowledge_visibility kv ON k.id = kv.knowledge_id
         WHERE k.status = 'published'
           AND (kv.visibility_level = 'public' OR kv.visibility_level IS NULL)
           AND (k.is_featured = 1 OR k.view_count > 100)
         ORDER BY k.is_featured DESC, k.view_count DESC
         LIMIT 6`
      );

      res.json({
        success: true,
        records
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Single Knowledge Record Details
   */
  static async getDetails(req, res, next) {
    try {
      const { id_or_slug } = req.params;
      const user = req.session && req.session.user ? req.session.user : null;

      const [records] = await db.query(
        `SELECT k.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                u.id as expert_id,
                CASE WHEN ep.public_profile_visible = 1 THEN u.full_name ELSE 'LifeTrace Contributor' END as expert_name,
                CASE WHEN ep.public_profile_visible = 1 THEN u.avatar_url ELSE NULL END as expert_avatar,
                CASE WHEN ep.public_profile_visible = 1 THEN ep.bio ELSE NULL END as expert_bio,
                CASE WHEN ep.public_profile_visible = 1 THEN ep.areas_of_expertise ELSE NULL END as areas_of_expertise,
                CASE WHEN ep.public_profile_visible = 1 THEN ep.organization_or_trade ELSE NULL END as organization_or_trade,
                CASE WHEN ep.public_profile_visible = 1 THEN ep.location ELSE NULL END as expert_location,
                ep.verified_expert,
                kv.visibility_level, kv.allow_comments, kv.allow_assessments,
                rev_user.full_name as reviewer_name
         FROM knowledge_records k
         JOIN categories c ON k.category_id = c.id
         JOIN users u ON k.expert_id = u.id
         LEFT JOIN expert_profiles ep ON u.id = ep.user_id
         LEFT JOIN knowledge_visibility kv ON k.id = kv.knowledge_id
         LEFT JOIN users rev_user ON k.reviewer_id = rev_user.id
         WHERE k.id = ? OR k.slug = ?`,
        [id_or_slug, id_or_slug]
      );

      if (!records || records.length === 0) {
        return res.status(404).json({ success: false, message: 'Knowledge record not found.' });
      }

      const record = records[0];

      // Access Control: If not published, only author, reviewer, or admin can view
      if (record.status !== 'published') {
        const canView = user && (user.id === record.expert_id || user.role === 'reviewer' || user.role === 'admin');
        if (!canView) {
          return res.status(403).json({
            success: false,
            message: 'This knowledge record is currently undergoing technical review and is not publicly accessible.'
          });
        }
      }

      const visibility = record.visibility_level || 'public';
      const isOwner = user && user.id === record.expert_id;
      let isAssignedReviewer = false;
      if (user && user.role === 'reviewer') {
        const [assignments] = await db.query(
          "SELECT id FROM knowledge_review_assignments WHERE knowledge_id = ? AND reviewer_id = ? LIMIT 1",
          [record.id, user.id]
        );
        isAssignedReviewer = assignments.length > 0;
      }
      const hasRestrictedAccess = Boolean(user && (isOwner || user.role === 'admin' || isAssignedReviewer));

      if (visibility === 'registered_learners' && !user) {
        return res.status(401).json({
          success: false,
          message: 'This practical knowledge record requires an active LifeTrace learner account to view.'
        });
      }
      if (visibility === 'registered_learners' && user.role !== 'learner' && !hasRestrictedAccess) {
        return res.status(403).json({ success: false, message: 'This knowledge record is available to registered learners only.' });
      }
      if (visibility !== 'public' && visibility !== 'registered_learners' && !hasRestrictedAccess) {
        return res.status(403).json({ success: false, message: 'You are not authorized to view this restricted knowledge record.' });
      }

      // Fetch Sub-Entities: Steps, Tools, Materials, Media, Assessment
      const [steps] = await db.query(
        'SELECT * FROM knowledge_steps WHERE knowledge_id = ? ORDER BY step_number ASC',
        [record.id]
      );

      const [tools] = await db.query(
        'SELECT * FROM knowledge_tools WHERE knowledge_id = ? ORDER BY id ASC',
        [record.id]
      );

      const [materials] = await db.query(
        'SELECT * FROM knowledge_materials WHERE knowledge_id = ? ORDER BY id ASC',
        [record.id]
      );

      const [media] = await db.query(
        'SELECT * FROM knowledge_media WHERE knowledge_id = ? ORDER BY is_primary DESC, id ASC',
        [record.id]
      );

      const [assessments] = await db.query(
        'SELECT id, title, description, passing_score, time_limit_minutes FROM assessments WHERE knowledge_id = ? AND is_active = 1',
        [record.id]
      );

      // Increment view count if published
      if (record.status === 'published') {
        db.query('UPDATE knowledge_records SET view_count = view_count + 1 WHERE id = ?', [record.id]).catch(() => {});
      }

      // Learner context: check if enrolled, progress, bookmark, practical submission
      let learnerProgress = null;
      let isBookmarked = false;
      let practicalSubmission = null;
      let certificate = null;

      if (user) {
        const [pRows] = await db.query(
          'SELECT * FROM learning_progress WHERE learner_id = ? AND knowledge_id = ?',
          [user.id, record.id]
        );
        learnerProgress = pRows[0] || null;

        const [bmRows] = await db.query(
          'SELECT id FROM bookmarks WHERE user_id = ? AND knowledge_id = ?',
          [user.id, record.id]
        );
        isBookmarked = bmRows.length > 0;

        const [psRows] = await db.query(
          'SELECT * FROM practical_submissions WHERE learner_id = ? AND knowledge_id = ? ORDER BY id DESC LIMIT 1',
          [user.id, record.id]
        );
        practicalSubmission = psRows[0] || null;

        const [certRows] = await db.query(
          'SELECT certificate_code, issue_date, status, verification_url FROM certificates WHERE learner_id = ? AND knowledge_id = ?',
          [user.id, record.id]
        );
        certificate = certRows[0] || null;
      }

      // Related records in same category
      const [related] = await db.query(
        `SELECT k.id, k.title, k.slug, k.cover_image_url, k.skill_level, k.estimated_time_minutes,
                c.name as category_name
         FROM knowledge_records k
         JOIN categories c ON k.category_id = c.id
         LEFT JOIN knowledge_visibility kv ON k.id = kv.knowledge_id
         WHERE k.category_id = ? AND k.id != ? AND k.status = 'published'
           AND (kv.visibility_level = 'public' OR kv.visibility_level IS NULL)
         LIMIT 3`,
        [record.category_id, record.id]
      );

      res.json({
        success: true,
        record: {
          ...record,
          steps,
          tools,
          materials,
          media,
          assessment: assessments[0] || null,
          learnerProgress,
          isBookmarked,
          practicalSubmission,
          certificate,
          related
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert: Create Knowledge Record (Draft or Submit)
   */
  static async create(req, res, next) {
    try {
      const expertId = req.session.user.id;
      const {
        title,
        local_name,
        community_region,
        category_id,
        short_summary,
        detailed_description,
        cultural_background,
        estimated_time_minutes,
        skill_level,
        preparation_instructions,
        material_sourcing,
        safety_precautions,
        common_mistakes,
        mistake_solutions,
        troubleshooting,
        expected_results,
        references_sources,
        attribution_consent,
        cover_image_url,
        demo_video_url,
        visibility_level = 'public',
        submit_for_review = false,
        steps = [],
        tools = [],
        materials = [],
        media = []
      } = req.body;

      // Generate unique slug
      const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const uniqueSuffix = Date.now().toString().slice(-4);
      const slug = `${baseSlug}-${uniqueSuffix}`;

      const status = submit_for_review ? 'submitted' : 'draft';

      const [result] = await db.query(
        `INSERT INTO knowledge_records (
          expert_id, category_id, title, local_name, community_region, slug, short_summary,
          detailed_description, cultural_background, estimated_time_minutes, skill_level,
          preparation_instructions, material_sourcing, safety_precautions, common_mistakes,
          mistake_solutions, troubleshooting, expected_results, references_sources,
          attribution_consent, cover_image_url, demo_video_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          expertId,
          parseInt(category_id, 10),
          title.trim(),
          local_name ? local_name.trim() : null,
          community_region ? community_region.trim() : null,
          slug,
          short_summary.trim(),
          detailed_description.trim(),
          cultural_background ? cultural_background.trim() : null,
          parseInt(estimated_time_minutes || 30, 10),
          skill_level || 'beginner',
          preparation_instructions || '',
          material_sourcing ? material_sourcing.trim() : null,
          safety_precautions.trim(),
          common_mistakes || '',
          mistake_solutions ? mistake_solutions.trim() : null,
          troubleshooting || '',
          expected_results || '',
          references_sources || '',
          attribution_consent ? attribution_consent.trim() : null,
          cover_image_url || '/assets/images/category-basket.svg',
          demo_video_url || null,
          status
        ]
      );

      const knowledgeId = result.insertId;

      // Visibility preferences
      await db.query(
        `INSERT INTO knowledge_visibility (knowledge_id, visibility_level, allow_comments, allow_assessments)
         VALUES (?, ?, 1, 1)`,
        [knowledgeId, visibility_level]
      );

      // Insert steps
      if (Array.isArray(steps) && steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (s.title && s.instruction) {
            await db.query(
              `INSERT INTO knowledge_steps (knowledge_id, step_number, title, instruction, safety_warning, tip, image_url, video_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [knowledgeId, i + 1, s.title.trim(), s.instruction.trim(), s.safety_warning || '', s.tip || '', s.image_url || null, s.video_url || null]
            );
          }
        }
      }

      // Insert tools
      if (Array.isArray(tools) && tools.length > 0) {
        for (const t of tools) {
          if (t.name) {
            await db.query(
              `INSERT INTO knowledge_tools (knowledge_id, name, local_name, specification, optional) VALUES (?, ?, ?, ?, ?)`,
              [knowledgeId, t.name.trim(), t.local_name ? t.local_name.trim() : null, t.specification || '', t.optional ? 1 : 0]
            );
          }
        }
      }

      // Insert materials
      if (Array.isArray(materials) && materials.length > 0) {
        for (const m of materials) {
          if (m.name) {
            await db.query(
              `INSERT INTO knowledge_materials (knowledge_id, name, local_name, quantity, unit, source_location, optional) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [knowledgeId, m.name.trim(), m.local_name ? m.local_name.trim() : null, m.quantity || '1', m.unit || 'pcs', m.source_location || null, m.optional ? 1 : 0]
            );
          }
        }
      }

      // Insert media
      if (Array.isArray(media) && media.length > 0) {
        for (const md of media) {
          if (md.file_path) {
            await db.query(
              `INSERT INTO knowledge_media (knowledge_id, media_type, file_path, original_filename, file_size, mime_type, caption, is_primary)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                knowledgeId,
                md.media_type || 'image',
                md.file_path,
                md.original_filename || 'media',
                md.file_size || 0,
                md.mime_type || 'image/jpeg',
                md.caption || '',
                md.is_primary ? 1 : 0
              ]
            );
          }
        }
      }

      // If submitted for review, notify reviewers and record review history
      if (submit_for_review) {
        await db.query(
          `INSERT INTO review_history (knowledge_id, previous_status, new_status, action, feedback_notes)
           VALUES (?, 'draft', 'submitted', 'Submitted for Review', 'Expert completed draft and requested technical review.')`,
          [knowledgeId]
        );

        await NotificationService.notifyRole({
          role: 'reviewer',
          title: 'New Knowledge Submission',
          message: `Expert ${req.session.user.full_name} submitted "${title}" for technical verification.`,
          type: 'action_required',
          link: `/review-management.html?id=${knowledgeId}`
        });
      }

      await AuditService.logRequest(req, {
        action: submit_for_review ? 'KNOWLEDGE_SUBMITTED' : 'KNOWLEDGE_DRAFT_CREATED',
        module: 'KNOWLEDGE',
        recordId: knowledgeId,
        details: { title, status }
      });

      res.status(201).json({
        success: true,
        message: submit_for_review
          ? 'Knowledge record submitted for reviewer verification successfully.'
          : 'Draft saved successfully. You can continue editing anytime.',
        knowledgeId,
        slug,
        status
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert/Admin: Update Knowledge Record
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.session.user;

      // Ownership check
      const [existing] = await db.query('SELECT expert_id, status, title FROM knowledge_records WHERE id = ?', [id]);
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Knowledge record not found.' });
      }

      const isOwner = existing[0].expert_id === user.id;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'You are not authorized to edit this knowledge record.' });
      }

      // If already approved/published, only admin or revision request can change
      if (existing[0].status === 'published' && !isAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Published knowledge records are locked to protect verified standards. Contact an administrator to submit a revision.'
        });
      }

      const {
        title,
        local_name,
        community_region,
        category_id,
        short_summary,
        detailed_description,
        cultural_background,
        estimated_time_minutes,
        skill_level,
        preparation_instructions,
        material_sourcing,
        safety_precautions,
        common_mistakes,
        mistake_solutions,
        troubleshooting,
        expected_results,
        references_sources,
        attribution_consent,
        cover_image_url,
        demo_video_url,
        visibility_level,
        submit_for_review,
        steps,
        tools,
        materials
      } = req.body;

      let newStatus = existing[0].status;
      if (submit_for_review) {
        newStatus = 'submitted';
      }

      await db.query(
        `UPDATE knowledge_records SET
          title = COALESCE(?, title),
          local_name = COALESCE(?, local_name),
          community_region = COALESCE(?, community_region),
          category_id = COALESCE(?, category_id),
          short_summary = COALESCE(?, short_summary),
          detailed_description = COALESCE(?, detailed_description),
          cultural_background = COALESCE(?, cultural_background),
          estimated_time_minutes = COALESCE(?, estimated_time_minutes),
          skill_level = COALESCE(?, skill_level),
          preparation_instructions = COALESCE(?, preparation_instructions),
          material_sourcing = COALESCE(?, material_sourcing),
          safety_precautions = COALESCE(?, safety_precautions),
          common_mistakes = COALESCE(?, common_mistakes),
          mistake_solutions = COALESCE(?, mistake_solutions),
          troubleshooting = COALESCE(?, troubleshooting),
          expected_results = COALESCE(?, expected_results),
          references_sources = COALESCE(?, references_sources),
          attribution_consent = COALESCE(?, attribution_consent),
          cover_image_url = COALESCE(?, cover_image_url),
          demo_video_url = COALESCE(?, demo_video_url),
          status = ?
         WHERE id = ?`,
        [
          title ? title.trim() : null,
          local_name ? local_name.trim() : null,
          community_region ? community_region.trim() : null,
          category_id ? parseInt(category_id, 10) : null,
          short_summary ? short_summary.trim() : null,
          detailed_description ? detailed_description.trim() : null,
          cultural_background ? cultural_background.trim() : null,
          estimated_time_minutes ? parseInt(estimated_time_minutes, 10) : null,
          skill_level || null,
          preparation_instructions || null,
          material_sourcing ? material_sourcing.trim() : null,
          safety_precautions ? safety_precautions.trim() : null,
          common_mistakes || null,
          mistake_solutions ? mistake_solutions.trim() : null,
          troubleshooting || null,
          expected_results || null,
          references_sources || null,
          attribution_consent ? attribution_consent.trim() : null,
          cover_image_url || null,
          demo_video_url || null,
          newStatus,
          id
        ]
      );

      // Replace steps if provided
      if (Array.isArray(steps) && steps.length > 0) {
        await db.query('DELETE FROM knowledge_steps WHERE knowledge_id = ?', [id]);
        for (let i = 0; i < steps.length; i++) {
          const s = steps[i];
          if (s.title && s.instruction) {
            await db.query(
              `INSERT INTO knowledge_steps (knowledge_id, step_number, title, instruction, safety_warning, tip, image_url, video_url)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [id, i + 1, s.title.trim(), s.instruction.trim(), s.safety_warning || '', s.tip || '', s.image_url || null, s.video_url || null]
            );
          }
        }
      }

      // Replace tools if provided
      if (Array.isArray(tools)) {
        await db.query('DELETE FROM knowledge_tools WHERE knowledge_id = ?', [id]);
        for (const t of tools) {
          if (t.name) {
            await db.query(
              `INSERT INTO knowledge_tools (knowledge_id, name, local_name, specification, optional) VALUES (?, ?, ?, ?, ?)`,
              [id, t.name.trim(), t.local_name ? t.local_name.trim() : null, t.specification || '', t.optional ? 1 : 0]
            );
          }
        }
      }

      // Replace materials if provided
      if (Array.isArray(materials)) {
        await db.query('DELETE FROM knowledge_materials WHERE knowledge_id = ?', [id]);
        for (const m of materials) {
          if (m.name) {
            await db.query(
              `INSERT INTO knowledge_materials (knowledge_id, name, local_name, quantity, unit, source_location, optional) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [id, m.name.trim(), m.local_name ? m.local_name.trim() : null, m.quantity || '1', m.unit || 'pcs', m.source_location || null, m.optional ? 1 : 0]
            );
          }
        }
      }

      if (submit_for_review && existing[0].status !== 'submitted') {
        await db.query(
          `INSERT INTO review_history (knowledge_id, previous_status, new_status, action, feedback_notes)
           VALUES (?, ?, 'submitted', 'Resubmitted for Review', 'Expert updated record and requested review.')`,
          [id, existing[0].status]
        );

        await NotificationService.notifyRole({
          role: 'reviewer',
          title: 'Knowledge Resubmitted',
          message: `Expert ${user.full_name} resubmitted "${title || existing[0].title}" for review.`,
          type: 'action_required',
          link: `/review-management.html?id=${id}`
        });
      }

      await AuditService.logRequest(req, {
        action: 'KNOWLEDGE_UPDATED',
        module: 'KNOWLEDGE',
        recordId: id,
        details: { title: title || existing[0].title, newStatus }
      });

      res.json({
        success: true,
        message: submit_for_review ? 'Record resubmitted for verification.' : 'Record updated successfully.',
        status: newStatus
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert/Admin: Delete Draft Knowledge Record
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.session.user;

      const [existing] = await db.query('SELECT expert_id, status, title FROM knowledge_records WHERE id = ?', [id]);
      if (!existing.length) {
        return res.status(404).json({ success: false, message: 'Record not found.' });
      }

      const isOwner = existing[0].expert_id === user.id;
      const isAdmin = user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Unauthorized to delete this record.' });
      }

      if (existing[0].status === 'published' && !isAdmin) {
        return res.status(400).json({ success: false, message: 'Published records can only be archived by administrators.' });
      }

      await db.query('DELETE FROM knowledge_records WHERE id = ?', [id]);

      await AuditService.logRequest(req, {
        action: 'KNOWLEDGE_DELETED',
        module: 'KNOWLEDGE',
        recordId: id,
        details: { title: existing[0].title }
      });

      res.json({
        success: true,
        message: 'Knowledge record deleted successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Expert: View My Own Knowledge Records
   */
  static async getMySubmissions(req, res, next) {
    try {
      const expertId = req.session.user.id;
      const { status } = req.query;

      let sql = `
        SELECT k.*, c.name as category_name, c.icon as category_icon,
               (SELECT COUNT(*) FROM knowledge_steps WHERE knowledge_id = k.id) as steps_count,
               (SELECT COUNT(*) FROM learning_progress WHERE knowledge_id = k.id) as enrolled_learners_count,
               (SELECT COUNT(*) FROM practical_submissions WHERE knowledge_id = k.id) as practical_submissions_count,
               r.comments as latest_review_comments, r.decision as latest_review_decision
        FROM knowledge_records k
        JOIN categories c ON k.category_id = c.id
        LEFT JOIN reviews r ON k.id = r.knowledge_id
        WHERE k.expert_id = ?
      `;
      const params = [expertId];

      if (status && status !== 'all') {
        sql += ' AND k.status = ?';
        params.push(status);
      }

      sql += ' ORDER BY k.updated_at DESC';

      const [rows] = await db.query(sql, params);

      res.json({
        success: true,
        records: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Toggle Bookmark
   */
  static async toggleBookmark(req, res, next) {
    try {
      const userId = req.session.user.id;
      const { id } = req.params;

      const [existing] = await db.query('SELECT id FROM bookmarks WHERE user_id = ? AND knowledge_id = ?', [userId, id]);

      if (existing.length > 0) {
        await db.query('DELETE FROM bookmarks WHERE user_id = ? AND knowledge_id = ?', [userId, id]);
        return res.json({ success: true, bookmarked: false, message: 'Removed from your bookmarks.' });
      } else {
        await db.query('INSERT INTO bookmarks (user_id, knowledge_id) VALUES (?, ?)', [userId, id]);
        return res.json({ success: true, bookmarked: true, message: 'Saved to your bookmarks!' });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * Learner: Get Saved Bookmarks
   */
  static async getMyBookmarks(req, res, next) {
    try {
      const userId = req.session.user.id;

      const [rows] = await db.query(
        `SELECT k.id, k.title, k.slug, k.short_summary, k.skill_level, k.cover_image_url,
                k.estimated_time_minutes, k.view_count,
                c.name as category_name, c.icon as category_icon,
                u.full_name as expert_name, u.avatar_url as expert_avatar,
                b.created_at as bookmarked_at
         FROM bookmarks b
         JOIN knowledge_records k ON b.knowledge_id = k.id
         JOIN categories c ON k.category_id = c.id
         JOIN users u ON k.expert_id = u.id
         WHERE b.user_id = ? AND k.status = 'published'
         ORDER BY b.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        bookmarks: rows
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = KnowledgeController;

