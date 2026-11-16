const fs = require('fs');
const db = require('../config/db');
const AuditService = require('../services/auditService');
const { uploadDirs } = require('../middleware/uploadMiddleware');

class MediaController {
  /**
   * Upload Media (Image/Video/PDF)
   */
  static async uploadMedia(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file was uploaded.' });
      }

      const file = req.file;
      const relativeUrl = `/uploads/media/${file.filename}`;
      const { knowledge_id, caption, is_primary } = req.body;

      if (!knowledge_id) {
        await fs.promises.unlink(file.path);
        return res.status(400).json({ success: false, message: 'Select a craft record before uploading knowledge media.' });
      }

      const [knowledge] = await db.query('SELECT expert_id FROM knowledge_records WHERE id = ?', [knowledge_id]);
      if (!knowledge.length || (Number(knowledge[0].expert_id) !== Number(req.session.user.id) && req.session.user.role !== 'admin')) {
        await fs.promises.unlink(file.path);
        return res.status(403).json({ success: false, message: 'You may only upload media to a craft record you are authorized to manage.' });
      }

      let mediaType = 'image';
      if (file.mimetype.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.mimetype === 'application/pdf') {
        mediaType = 'document';
      }

      const [insertResult] = await db.query(
        `INSERT INTO knowledge_media (knowledge_id, media_type, file_path, original_filename, file_size, mime_type, caption, is_primary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          knowledge_id,
          mediaType,
          relativeUrl,
          file.originalname,
          file.size,
          file.mimetype,
          caption || '',
          is_primary ? 1 : 0
        ]
      );
      const mediaId = insertResult.insertId;

      await AuditService.logRequest(req, {
        action: 'MEDIA_UPLOADED',
        module: 'MEDIA',
        recordId: mediaId,
        details: { filename: file.filename, originalName: file.originalname, size: file.size, type: mediaType }
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded safely.',
        mediaId,
        url: relativeUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        mediaType
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Serve uploaded files only when their owning content is visible to the requester.
   */
  static async serveUpload(req, res, next) {
    try {
      const { type, filename } = req.params;
      if (!['media', 'avatars', 'submissions'].includes(type) || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return res.status(404).end();
      }

      const url = `/uploads/${type}/${filename}`;
      const user = req.session && req.session.user ? req.session.user : null;
      let permitted = false;

      if (type === 'avatars') {
        const [avatars] = await db.query('SELECT id FROM users WHERE avatar_url = ? LIMIT 1', [url]);
        permitted = avatars.length > 0;
      } else if (type === 'media') {
        const [records] = await db.query(
          `SELECT k.id, k.expert_id, k.reviewer_id, k.status,
                  COALESCE(kv.visibility_level, 'public') AS visibility_level
           FROM knowledge_records k
           LEFT JOIN knowledge_visibility kv ON kv.knowledge_id = k.id
           WHERE k.cover_image_url = ? OR k.demo_video_url = ?
              OR EXISTS (SELECT 1 FROM knowledge_media km WHERE km.knowledge_id = k.id AND km.file_path = ?)
              OR EXISTS (SELECT 1 FROM knowledge_steps ks WHERE ks.knowledge_id = k.id AND (ks.image_url = ? OR ks.video_url = ?))
           LIMIT 1`,
          [url, url, url, url, url]
        );
        if (records.length) {
          const record = records[0];
          const isOwner = user && Number(user.id) === Number(record.expert_id);
          const isAdmin = user && user.role === 'admin';
          const isAssignedReviewer = user && user.role === 'reviewer' &&
            (Number(user.id) === Number(record.reviewer_id) ||
              (await db.query('SELECT id FROM knowledge_review_assignments WHERE knowledge_id = ? AND reviewer_id = ? LIMIT 1', [record.id, user.id]))[0].length > 0);
          const hasRestrictedAccess = Boolean(isOwner || isAdmin || isAssignedReviewer);

          if (record.status !== 'published') {
            permitted = Boolean(user && (isOwner || isAdmin || user.role === 'reviewer'));
          } else if (record.visibility_level === 'public') {
            permitted = true;
          } else if (record.visibility_level === 'registered_learners') {
            permitted = Boolean(user && (user.role === 'learner' || hasRestrictedAccess));
          } else {
            permitted = hasRestrictedAccess;
          }
        }
      } else {
        const [evidence] = await db.query(
          `SELECT ps.learner_id, ps.assessor_id, k.expert_id
           FROM submission_evidence se
           JOIN practical_submissions ps ON ps.id = se.submission_id
           JOIN knowledge_records k ON k.id = ps.knowledge_id
           WHERE se.file_url = ?
           LIMIT 1`,
          [url]
        );
        if (evidence.length && user) {
          const item = evidence[0];
          permitted = user.role === 'admin' ||
            Number(user.id) === Number(item.learner_id) ||
            Number(user.id) === Number(item.assessor_id) ||
            (user.role === 'expert' && Number(user.id) === Number(item.expert_id));
        }
      }

      if (!permitted) {
        return res.status(user ? 403 : 401).end();
      }

      return res.sendFile(filename, { root: uploadDirs[type], dotfiles: 'deny' }, (err) => {
        if (err) {
          if (err.code === 'ENOENT') return res.status(404).end();
          return next(err);
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload Avatar
   */
  static async uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No image file uploaded.' });
      }

      const file = req.file;
      const relativeUrl = `/uploads/avatars/${file.filename}`;
      const userId = req.session.user.id;

      await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [relativeUrl, userId]);
      req.session.user.avatar_url = relativeUrl;

      await AuditService.logRequest(req, {
        action: 'AVATAR_UPLOADED',
        module: 'USER',
        recordId: userId,
        details: { filename: file.filename }
      });

      res.json({
        success: true,
        message: 'Avatar updated successfully.',
        avatarUrl: relativeUrl
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload Practical Submission Evidence File
   */
  static async uploadSubmissionFile(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
      }

      const file = req.file;
      const relativeUrl = `/uploads/submissions/${file.filename}`;

      res.json({
        success: true,
        message: 'Practical evidence file uploaded.',
        fileUrl: relativeUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MediaController;

