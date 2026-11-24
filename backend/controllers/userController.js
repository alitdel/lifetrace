const db = require('../config/db');
const AuditService = require('../services/auditService');

class UserController {
  /**
   * Get User Profile (Self)
   */
  static async getProfile(req, res, next) {
    try {
      const userId = req.session.user.id;
      const [users] = await db.query(
        `SELECT id, username, email, role, full_name, phone, status, avatar_url, created_at, last_login
         FROM users WHERE id = ?`,
        [userId]
      );

      if (!users.length) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      const user = users[0];
      let profile = null;

      if (user.role === 'expert') {
        const [ep] = await db.query('SELECT * FROM expert_profiles WHERE user_id = ?', [userId]);
        profile = ep[0] || null;
      } else if (user.role === 'learner') {
        const [lp] = await db.query('SELECT * FROM learner_profiles WHERE user_id = ?', [userId]);
        profile = lp[0] || null;
      } else if (user.role === 'reviewer') {
        const [rp] = await db.query('SELECT * FROM reviewer_profiles WHERE user_id = ?', [userId]);
        profile = rp[0] || null;
      }

      res.json({
        success: true,
        user: { ...user, profile }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update User Profile (Self)
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { full_name, phone, bio, location } = req.body;

      // Update primary user details
      await db.query(
        `UPDATE users SET
           full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone)
         WHERE id = ?`,
        [full_name, phone, userId]
      );

      if (userRole === 'expert') {
        const { areas_of_expertise, experience_years, organization_or_trade, contact_email, contact_phone, public_profile_visible } = req.body;
        const [existing] = await db.query('SELECT user_id FROM expert_profiles WHERE user_id = ?', [userId]);

        if (existing.length > 0) {
          await db.query(
            `UPDATE expert_profiles SET
               bio = ?, areas_of_expertise = ?, experience_years = ?, organization_or_trade = ?,
               location = ?, contact_email = ?, contact_phone = ?, public_profile_visible = ?
             WHERE user_id = ?`,
            [
              bio || '',
              areas_of_expertise || 'General Skills',
              experience_years || 1,
              organization_or_trade || '',
              location || 'Uganda',
              contact_email || null,
              contact_phone || null,
              public_profile_visible !== undefined ? (public_profile_visible ? 1 : 0) : 1,
              userId
            ]
          );
        } else {
          await db.query(
            `INSERT INTO expert_profiles (user_id, bio, areas_of_expertise, experience_years, organization_or_trade, location, contact_email, contact_phone, public_profile_visible)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              bio || '',
              areas_of_expertise || 'General Skills',
              experience_years || 1,
              organization_or_trade || '',
              location || 'Uganda',
              contact_email || null,
              contact_phone || null,
              public_profile_visible !== undefined ? (public_profile_visible ? 1 : 0) : 1
            ]
          );
        }
      } else if (userRole === 'learner') {
        const { education_level, primary_interest } = req.body;
        const [existing] = await db.query('SELECT user_id FROM learner_profiles WHERE user_id = ?', [userId]);

        if (existing.length > 0) {
          await db.query(
            `UPDATE learner_profiles SET bio = ?, education_level = ?, primary_interest = ?, location = ? WHERE user_id = ?`,
            [bio || '', education_level || '', primary_interest || '', location || 'Uganda', userId]
          );
        } else {
          await db.query(
            `INSERT INTO learner_profiles (user_id, bio, education_level, primary_interest, location)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, bio || '', education_level || '', primary_interest || '', location || 'Uganda']
          );
        }
      } else if (userRole === 'reviewer') {
        const { qualification, specialization_domains, institution_or_guild } = req.body;
        const [existing] = await db.query('SELECT user_id FROM reviewer_profiles WHERE user_id = ?', [userId]);

        if (existing.length > 0) {
          await db.query(
            `UPDATE reviewer_profiles SET qualification = ?, specialization_domains = ?, institution_or_guild = ? WHERE user_id = ?`,
            [qualification || 'Technical Reviewer', specialization_domains || 'Quality & Safety', institution_or_guild || '', userId]
          );
        } else {
          await db.query(
            `INSERT INTO reviewer_profiles (user_id, qualification, specialization_domains, institution_or_guild)
             VALUES (?, ?, ?, ?)`,
            [userId, qualification || 'Technical Reviewer', specialization_domains || 'Quality & Safety', institution_or_guild || '']
          );
        }
      }

      await AuditService.logRequest(req, {
        action: 'PROFILE_UPDATED',
        module: 'USER',
        recordId: userId
      });

      // Refresh session full_name
      if (full_name) {
        req.session.user.full_name = full_name;
      }

      res.json({
        success: true,
        message: 'Profile successfully updated.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Public List of Verified Experts/Craftspeople
   */
  static async getPublicExperts(req, res, next) {
    try {
      const { search, location } = req.query;

      let sql = `
        SELECT u.id, u.full_name, u.username, u.avatar_url,
               ep.bio, ep.areas_of_expertise, ep.experience_years, ep.organization_or_trade, ep.location,
               (SELECT COUNT(*) FROM knowledge_records k WHERE k.expert_id = u.id AND k.status = 'published') as craft_count
        FROM users u
        JOIN expert_profiles ep ON u.id = ep.user_id
        WHERE u.status = 'active' AND ep.public_profile_visible = 1
      `;
      const params = [];

      if (search) {
        sql += ` AND (u.full_name LIKE ? OR ep.areas_of_expertise LIKE ? OR ep.organization_or_trade LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q, q);
      }

      if (location) {
        sql += ` AND ep.location LIKE ?`;
        params.push(`%${location}%`);
      }

      sql += ` ORDER BY craft_count DESC, ep.experience_years DESC LIMIT 50`;

      const [experts] = await db.query(sql, params);

      res.json({
        success: true,
        count: experts.length,
        experts
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get Specific Expert Profile Details
   */
  static async getExpertDetails(req, res, next) {
    try {
      const expertId = parseInt(req.params.id, 10);

      const [users] = await db.query(
        `SELECT u.id, u.full_name, u.username, u.avatar_url, u.created_at,
                ep.bio, ep.areas_of_expertise, ep.experience_years, ep.organization_or_trade,
                ep.location, ep.contact_email, ep.contact_phone
         FROM users u
         JOIN expert_profiles ep ON u.id = ep.user_id
         WHERE u.id = ? AND u.role = 'expert' AND u.status = 'active'`,
        [expertId]
      );

      if (!users.length) {
        return res.status(404).json({ success: false, message: 'Expert craftsperson not found.' });
      }

      const expert = users[0];

      // Get published craft records
      const [crafts] = await db.query(
        `SELECT k.id, k.title, k.local_name, k.slug, k.short_description, k.difficulty_level,
                k.estimated_hours, k.cover_image_url, c.name as category_name, c.icon_class
         FROM knowledge_records k
         JOIN categories c ON k.category_id = c.id
         WHERE k.expert_id = ? AND k.status = 'published'
         ORDER BY k.created_at DESC`,
        [expertId]
      );

      res.json({
        success: true,
        expert: { ...expert, crafts }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;
