import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql2";
import path from "path";
import { fileURLToPath } from 'url';
import bcrypt from "bcrypt";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    port: "3307",
    database: "hackaton-test"
});

db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
        return;
    }
    console.log('Успешное подключение к базе данных!');
});

// Настройки для загрузки изображений
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, "public/uploads"));
    },
    filename: (req, file, cb) => {
        cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Введите email и пароль" });
    }

    const query = "SELECT * FROM users WHERE email = ?";
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: "Ошибка сервера" });

        if (results.length === 0) {
            return res.status(401).json({ error: "Неверный email или пароль" });
        }

        const user = results[0];

        // Проверяем хэш пароля
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: "Неверный email или пароль" });
        }

        res.status(200).json({ message: "Вход выполнен", userId: user.id, email: user.email });
    });
});

app.get('/api/tests/:id', (req, res) => {
    const testId = req.params.id;

    db.query(`SELECT * FROM tests WHERE id = ?`, [testId], (err, testResults) => {
        if (err) return res.status(500).json({ error: 'Ошибка при получении теста.' });

        db.query(`SELECT * FROM test_questions WHERE test_id = ?`, [testId], (err, questionResults) => {
            if (err) return res.status(500).json({ error: 'Ошибка при получении вопросов.' });

            const questionIds = questionResults.map(q => q.id);
            db.query(`SELECT * FROM test_answers WHERE question_id IN (?)`, [questionIds], (err, answerResults) => {
                if (err) return res.status(500).json({ error: 'Ошибка при получении ответов.' });

                const questionsWithAnswers = questionResults.map(q => ({
                    ...q,
                    answers: answerResults.filter(a => a.question_id === q.id)
                }));

                res.status(200).json({
                    test: testResults[0],
                    questions: questionsWithAnswers
                });
            });
        });
    });
});

app.post('/api/submit', (req, res) => {
    const { user_id, test_id, answers } = req.body;

    if (!user_id || !test_id || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Некорректные данные' });
    }

    // Проверяем, что у каждого ответа есть question_id и answer_ids
    for (let answer of answers) {
        if (!answer.question_id || !Array.isArray(answer.answer_ids)) {
            return res.status(400).json({ error: 'Некорректный формат ответов' });
        }
    }

    const questionIds = answers.map(a => a.question_id);

    // Получаем правильные ответы из БД
    db.query(`SELECT question_id, id FROM test_answers WHERE is_correct = 1 AND question_id IN (?)`,
        [questionIds], (err, correctResults) => {
            if (err) return res.status(500).json({ error: 'Ошибка при получении правильных ответов.' });

            // Группируем правильные ответы по вопросам
            const correctAnswersMap = {};
            correctResults.forEach(({ question_id, id }) => {
                if (!correctAnswersMap[question_id]) correctAnswersMap[question_id] = [];
                correctAnswersMap[question_id].push(id);
            });

            let correctCount = 0;
            const answersWithCorrectness = answers.map(a => {
                const userAnswers = a.answer_ids.map(id => parseInt(id)); // Приводим к числам
                const correctAnswers = correctAnswersMap[a.question_id] || [];

                // Проверяем, что пользователь выбрал ровно те ответы, которые верные
                const isCorrect =
                    userAnswers.length === correctAnswers.length &&
                    userAnswers.every(id => correctAnswers.includes(id));

                if (isCorrect) correctCount++;

                return [a.question_id, JSON.stringify(a.answer_ids), isCorrect ? 1 : 0];
            });

            const totalQuestions = answers.length;
            const score = Math.round((correctCount / totalQuestions) * 100);

            // Сохраняем статистику теста
            const insertStatistics = `
                INSERT INTO user_statistics (user_id, test_id, score, time_taken, correct_answers, total_questions)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(insertStatistics, [user_id, test_id, score, 0, correctCount, totalQuestions], (err, statResult) => {
                if (err) return res.status(500).json({ error: 'Ошибка при сохранении статистики.' });

                const statisticId = statResult.insertId;

                // Сохраняем пользовательские ответы
                const insertAnswer = `
                    INSERT INTO user_answers (statistic_id, question_id, user_answer, is_correct)
                    VALUES ?
                `;

                const answerValues = answersWithCorrectness.map(a => [statisticId, ...a]);

                db.query(insertAnswer, [answerValues], (err) => {
                    if (err) return res.status(500).json({ error: 'Ошибка при сохранении ответов.' });

                    res.status(200).json({ message: 'Результаты успешно сохранены!', score, total: totalQuestions });
                });
            });
        });
});



//Создание теста с 4 вар ответов
app.post("/api/create-test", (req, res) => {
    const { title, subject, userId, questions } = req.body;

    if (!title || !subject || !userId || !questions.length) {
        return res.status(400).json({ status: "error", error: "Все поля обязательны!" });
    }

    // 1. Создаем тест в таблице `tests`
    const testQuery = "INSERT INTO tests (title, subject, created_by) VALUES (?, ?, ?)";
    db.query(testQuery, [title, subject, userId], (err, testResult) => {
        if (err) {
            console.error("Ошибка при создании теста:", err);
            return res.status(500).json({ status: "error", error: "Ошибка сервера при создании теста" });
        }

        const testId = testResult.insertId; // ID созданного теста

        // 2. Добавляем вопросы
        const questionQuery = "INSERT INTO test_questions (test_id, question_text) VALUES ?";
        const questionValues = questions.map(q => [testId, q.text]);

        db.query(questionQuery, [questionValues], (err, questionResult) => {
            if (err) {
                console.error("Ошибка при сохранении вопросов:", err);
                return res.status(500).json({ status: "error", error: "Ошибка сервера при сохранении вопросов" });
            }

            const questionIds = questionResult.insertId; // ID первого вопроса
            const answerQuery = "INSERT INTO test_answers (question_id, answer_text, is_correct) VALUES ?";
            let answerValues = [];

            questions.forEach((q, index) => {
                q.answers.forEach((answer, i) => {
                    answerValues.push([questionIds + index, answer.text, answer.isCorrect ? 1 : 0]);
                });
            });

            db.query(answerQuery, [answerValues], (err) => {
                if (err) {
                    console.error("Ошибка при сохранении ответов:", err);
                    return res.status(500).json({ status: "error", error: "Ошибка сервера при сохранении ответов" });
                }

                res.status(201).json({ status: "ok", message: "Тест успешно создан!", testId });
            });
        });
    });
});


// API для регистрации пользователя
app.post('/api/users', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Не все обязательные поля заполнены!' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `
            INSERT INTO users (first_name, last_name, email, password_hash, birth_year, role)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(query, ['name', 'last_name', email, hashedPassword, 2000, 'student'], (err, result) => {
            if (err) {
                console.error('Ошибка при добавлении пользователя:', err.message);
                return res.status(500).json({ error: 'Ошибка добавления пользователя.' });
            }
            res.status(201).json({ message: 'Пользователь успешно добавлен!', id: result.insertId });
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка хеширования пароля' });
    }
});

//Создание коментарий
// Добавление комментария к тесту
app.post("/api/add-comment", (req, res) => {
    const { user_id, test_id, rating, comment } = req.body;

    if (!user_id || !test_id || !rating || !comment.trim()) {
        return res.status(400).json({ error: "Все поля обязательны!" });
    }

    const query = "INSERT INTO test_comments (test_id, user_id, rating, comment) VALUES (?, ?, ?, ?)";
    db.query(query, [test_id, user_id, rating, comment], (err, result) => {
        if (err) {
            console.error("Ошибка при добавлении комментария:", err);
            return res.status(500).json({ error: "Ошибка сервера при добавлении комментария" });
        }
        res.status(201).json({ message: "Комментарий успешно добавлен!" });
    });
});

// Получение всех комментариев для конкретного теста
app.get("/api/comments/:test_id", (req, res) => {
    const { test_id } = req.params;

    const query = `
        SELECT tc.comment, tc.rating, tc.created_at, u.first_name, u.last_name
        FROM test_comments tc
                 JOIN users u ON tc.user_id = u.id
        WHERE tc.test_id = ?
        ORDER BY tc.created_at DESC
    `;

    db.query(query, [test_id], (err, results) => {
        if (err) {
            console.error("Ошибка при получении комментариев:", err);
            return res.status(500).json({ error: "Ошибка сервера при получении комментариев" });
        }
        res.status(200).json(results);
    });
});

// API для получения статистики тестов
app.get("/api/statistics", (req, res) => {
    const query = `
        SELECT 
            t.id, 
            t.title, 
            (SELECT AVG(tc.rating) FROM test_comments tc WHERE tc.test_id = t.id) AS avg_rating,
            (SELECT tc.comment FROM test_comments tc WHERE tc.test_id = t.id ORDER BY tc.created_at DESC LIMIT 1) AS latest_comment
        FROM tests t
        ORDER BY t.id ASC
        LIMIT 20
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Ошибка при получении статистики:", err);
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.status(200).json(results);
    });
});


//Профиль тест
app.get("/api/profile/:userId", (req, res) => {
    const userId = req.params.userId;

    const query = `
        SELECT t.title, us.score, us.total_questions
        FROM user_statistics us
                 JOIN tests t ON us.test_id = t.id
        WHERE us.user_id = ?
        ORDER BY us.id DESC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Ошибка при загрузке профиля:", err);
            return res.status(500).json({ error: "Ошибка сервера при загрузке профиля" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Нет данных о пройденных тестах" });
        }

        res.status(200).json({ tests: results });
    });
});

// Запити до бази даних із async/await
// Получение профиля по ID (из URL)
app.get("/profile/:id", (req, res) => {
    const userId = req.params.id;

    db.query("SELECT id, first_name, last_name, email, phone_number, birth_year, role FROM users WHERE id = ?",
        [userId],
        (err, result) => {
            if (err) return res.status(500).send(err);
            if (result.length === 0) return res.status(404).json({ error: "Пользователь не найден" });
            res.json(result[0]);
        }
    );
});

// Обновление профиля (ID передается в теле запроса)
app.put("/profile", (req, res) => {
    const { id, first_name, last_name, phone_number, birth_year, role } = req.body;

    if (!id) {
        return res.status(400).json({ error: "Не указан userId" });
    }

    db.query("UPDATE users SET first_name = ?, last_name = ?, phone_number = ?, birth_year = ?, role = ? WHERE id = ?",
        [first_name, last_name, phone_number, birth_year, role, id],
        (err, result) => {
            if (err) return res.status(500).send(err);
            res.json({ message: "Профиль обновлен" });
        }
    );
});

//TEst avatar
// API для загрузки аватара
app.post("/upload-avatar", upload.single("avatar"), (req, res) => {
    const userId = req.body.userId;
    if (!userId || !req.file) {
        return res.status(400).json({ error: "Ошибка: не указан userId или файл" });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;
    const query = "UPDATE users SET avatar_url = ? WHERE id = ?";

    db.query(query, [avatarUrl, userId], (err, result) => {
        if (err) {
            console.error("Ошибка обновления аватара:", err);
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        res.json({ message: "Аватар обновлен", avatarUrl });
    });
});

// API для получения аватара текущего пользователя (ID из `localStorage`)
app.get("/avatar/:userId", (req, res) => {
    const userId = req.params.userId;
    const query = "SELECT avatar_url FROM users WHERE id = ?";

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Ошибка получения аватара:", err);
            return res.status(500).json({ error: "Ошибка сервера" });
        }
        if (results.length === 0 || !results[0].avatar_url) {
            return res.status(404).json({ error: "Аватар не найден" });
        }
        res.json({ avatarUrl: results[0].avatar_url });
    });
});

//Тест поиска
// API для поиска тестов
app.get('/api/search', (req, res) => {
    const query = req.query.query;
    if (!query){
        db.query(
            `SELECT id, title FROM tests`,
            [`%${query}%`],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
                res.json(results);
            }
        );    
    } else {
        db.query(
            `SELECT id, title FROM tests WHERE title LIKE ? LIMIT 10`,
            [`%${query}%`],
            (err, results) => {
                if (err) return res.status(500).json({ error: 'Ошибка базы данных' });
                res.json(results);
            }
        );
    }
});

// Перенаправление на страницу теста
app.get('/test/:id', (req, res) => {
    res.redirect(`/api/tests/${req.params.id}`);
});


const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});