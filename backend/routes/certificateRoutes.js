const express = require('express');
const router = express.Router();
const CertificateController = require('../controllers/certificateController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/verify/:code', CertificateController.verifyCode);
router.get('/my', requireAuth, CertificateController.getMyCertificates);
router.get('/:id_or_code', CertificateController.getCertificate);
router.post('/generate/:knowledgeId', requireAuth, CertificateController.requestCertificate);

module.exports = router;

