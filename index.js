import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mysql from 'mysql2';


const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Настройки базы данных MySQL
const db = mysql.createConnection({
    host: 'localhost',         // Хост вашего MySQL (по умолчанию localhost)
    user: 'root',              // Пользователь базы данных (замените на своего)
    password: 'root',  // Пароль к базе данных (замените на свой)
    database: 'hackaton-test'  // Название базы данных
});

// Подключаемся к БД
db.connect((err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных: ', err.message);
        return;
    }
    console.log('Успешное подключение к базе данных!');
});

// Тестовый маршрут
app.get('/', (req, res) => {
    res.send('Сервер работает! 🎉');
});

// Маршрут для получения всех пользователей
app.get('/api/users', (req, res) => {
    const query = 'SELECT * FROM users';
    db.query(query, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Ошибка при выполнении запроса.' });
            return;
        }
        res.status(200).json(results);
    });
});
// Маршрут для добавления нового пользователя
app.post('/api/users', (req, res) => {
    const { first_name, last_name, email, password_hash, phone_number, birth_year, role, avatar_url } = req.body;

    // Проверим, что обязательные поля заполнены
    if (!first_name || !last_name || !email || !password_hash || !birth_year || !role) {
        return res.status(400).json({ message: 'Не все обязательные поля заполнены!' });
    }

    const query = `
        INSERT INTO users (first_name, last_name, email, password_hash, phone_number, birth_year, role, avatar_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(query, [first_name, last_name, email, password_hash, phone_number, birth_year, role, avatar_url], (err, result) => {
        if (err) {
            console.error('Ошибка при добавлении пользователя:', err.message);
            res.status(500).json({ error: 'Ошибка добавления пользователя.' });
            return;
        }
        res.status(201).json({ message: 'Пользователь успешно добавлен!', id: result.insertId });
    });
});

// Запуск сервера
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});