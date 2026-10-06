const Router = require('@koa/router');
const c = require('../controllers/student.controller');
const m = require('../controllers/metrics.controller');
const g = require('../controllers/group.controller');

const router = new Router({ prefix: '/api' });

router.get('/students', c.list);
router.post('/students', c.create);
router.post('/students/batch', c.batch);
router.get('/students/stats', c.stats);
router.get('/students/:id', c.get);
router.put('/students/:id', c.update);
router.delete('/students/:id', c.remove);

router.get('/groups', g.list);
router.post('/groups', g.create);
router.get('/groups/:id/students', g.students);

router.get('/metrics', m.metrics);
router.get('/cache/stats', c.cacheStats);

module.exports = router;