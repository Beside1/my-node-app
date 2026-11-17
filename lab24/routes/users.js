const Router = require('@koa/router');
const userController = require('../controllers/userController');
const { validateBody, createUserSchema } = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = new Router({ prefix: '/api/users' });

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Получение списка пользователей
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Успешно
 */
router.get('/', userController.getAll);

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Получение статистики пользователей
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Успешно
 */
router.get('/stats', userController.getStats);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Получение пользователя по ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешно
 *       404:
 *         description: Пользователь не найден
 */
router.get('/:id', userController.getById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Создание нового пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - group_name
 *               - age
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               group_name:
 *                 type: string
 *               age:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Пользователь создан
 *       400:
 *         description: Ошибка валидации
 *       401:
 *         description: Неавторизован
 */
router.post('/', authMiddleware, validateBody(createUserSchema), userController.create);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Обновление пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешно
 */
router.put('/:id', authMiddleware, userController.update);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Удаление пользователя (только для admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успешно удалено
 *       403:
 *         description: Недостаточно прав
 */
router.delete('/:id', authMiddleware, requireRole('admin'), userController.delete);

module.exports = router;