const db = require('../config/db');
const AuditService = require('../services/auditService');

class UserController {
  /**
   * Get own profile
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
   * Update own profile
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { full_name, phone, avatar_url, bio, location } = req.body;

      if (!full_name || full_name.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Full name is required.' });
      }

      await db.query(
        `UPDATE users SET full_name = ?, phone = ?, avatar_url = COALESCE(?, avatar_url) WHERE id = ?`,
        [full_name.trim(), phone || null, avatar_url || null, userId]
      );

      // Update session
      req.session.user.full_name = full_name.trim();
      if (avatar_url) req.session.user.avatar_url = avatar_url;
      if (phone) req.session.user.phone = phone;

      if (userRole === 'expert') {
        const { areas_of_expertise, experience_years, organization_or_trade, contact_email, contact_phone, public_profile_visible } = req.body;
        
        await db.query(
          `INSERT INTO expert_profiles (user_id, bio, areas_of_expertise, experience_years, organization_or_trade, location, contact_email, contact_phone, public_profile_visible)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id) DO UPDATE SET
             bio=excluded.bio,
             areas_of_expertise=excluded.areas_of_expertise,
             experience_years=excluded.experience_years,
             organization_or_trade=excluded.organization_or_trade,
             location=excluded.location,
             contact_email=excluded.contact_email,
             contact_phone=excluded.contact_phone,
             public_profile_visible=excluded.public_profile_visible`,
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
        ).catch(async () => {
          // If ON CONFLICT isn't supported (standard MySQL), use MySQL syntax:
          await db.query(
            `INSERT INTO expert_profiles (user_id, bio, areas_of_expertise, experience_years, organization_or_trade, location, contact_email, contact_phone, public_profile_visible)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               bio=VALUES(bio),
               areas_of_expertise=VALUES(areas_of_expertise),
               experience_years=VALUES(experience_years),
               organization_or_trade=VALUES(organization_or_trade),
               location=VALUES(location),
               contact_email=VALUES(contact_email),
               contact_phone=VALUES(contact_phone),
               public_profile_visible=VALUES(public_profile_visible)`,
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
        });
      } else if (userRole === 'learner') {
        const { education_level, primary_interest } = req.body;
        await db.query(
          `INSERT INTO learner_profiles (user_id, bio, education_level, primary_interest, location)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (user_id) DO UPDATE SET
             bio=excluded.bio,
             education_level=excluded.education_level,
             primary_interest=excluded.primary_interest,
             location=excluded.location`,
          [userId, bio || '', education_level || '', primary_interest || '', location || 'Uganda']
        ).catch(async () => {
          await db.query(
            `INSERT INTO learner_profiles (user_id, bio, education_level, primary_interest, location)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
               bio=VALUES(bio),
               education_level=VALUES(education_level),
               primary_interest=VALUES(primary_interest),
               location=VALUES(location)`,
            [userId, bio || '', education_level || '', primary_interest || '', location || 'Uganda']
          );
        });
      }

      await AuditService.logRequest(req, {
        action: 'PROFILE_UPDATED',
        module: 'USER',
        recordId: userId
      });

      res.json({
        success: true,
        message: 'Profile updated successfully.'
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: List all public experts
   */
  static async getPublicExperts(req, res, next) {
    try {
      const [rows] = await db.query(
        `SELECT u.id, u.full_name, u.avatar_url, u.created_at as joined_date,
                ep.bio, ep.areas_of_expertise, ep.experience_years, ep.organization_or_trade,
                ep.location, ep.verified_expert,
                COUNT(k.id) as published_records_count
         FROM users u
         JOIN expert_profiles ep ON u.id = ep.user_id
         LEFT JOIN knowledge_records k ON u.id = k.expert_id AND k.status = 'published'
         WHERE u.role = 'expert' AND u.status = 'active' AND ep.public_profile_visible = 1
         GROUP BY u.id
         ORDER BY ep.verified_expert DESC, published_records_count DESC`
      );

      res.json({
        success: true,
        experts: rows
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public: Get Expert Detail and their published knowledge
   */
  static async getExpertDetails(req, res, next) {
    try {
      const expertId = req.params.id;
      const [users] = await db.query(
        `SELECT u.id, u.full_name, u.avatar_url, u.created_at as joined_date,
                ep.bio, ep.areas_of_expertise, ep.experience_years, ep.organization_or_trade,
                ep.location, ep.contact_email, ep.contact_phone, ep.verified_expert
         FROM users u
         JOIN expert_profiles ep ON u.id = ep.user_id
         WHERE u.id = ? AND u.role = 'expert' AND u.status = 'active'`,
        [expertId]
      );

      if (!users.length) {
        return res.status(404).json({ success: false, message: 'Expert profile not found or inactive.' });
      }

      const expert = users[0];

      // Published knowledge records by this expert
      const [records] = await db.query(
        `SELECT k.id, k.title, k.slug, k.short_summary, k.skill_level, k.cover_image_url,
                k.estimated_time_minutes, k.view_count, k.published_at,
                c.name as category_name, c.icon as category_icon
         FROM knowledge_records k
         JOIN categories c ON k.category_id = c.id
         WHERE k.expert_id = ? AND k.status = 'published'
         ORDER BY k.published_at DESC`,
        [expertId]
      );

      res.json({
        success: true,
        expert,
        records
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = UserController;

