-- --------------------------------------------------------
-- Хост:                         127.0.0.1
-- Версия сервера:               8.0.41 - MySQL Community Server - GPL
-- Операционная система:         Win64
-- HeidiSQL Версия:              12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Дамп структуры базы данных hackaton-test
CREATE DATABASE IF NOT EXISTS `hackaton-test` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `hackaton-test`;

-- Дамп структуры для таблица hackaton-test.tests
CREATE TABLE IF NOT EXISTS `tests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `subject` enum('math','english') NOT NULL,
  `created_by` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `tests_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

-- Дамп структуры для таблица hackaton-test.test_answers
CREATE TABLE IF NOT EXISTS `test_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `answer_text` varchar(255) NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `test_answers_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `test_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

-- Дамп структуры для таблица hackaton-test.test_comments
CREATE TABLE IF NOT EXISTS `test_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating` tinyint DEFAULT NULL,
  `comment` text NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `test_id` (`test_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `test_comments_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `test_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `test_comments_chk_1` CHECK ((`rating` between 1 and 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

-- Дамп структуры для таблица hackaton-test.test_questions
CREATE TABLE IF NOT EXISTS `test_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `test_id` int NOT NULL,
  `question_text` text NOT NULL,
  `image_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `test_id` (`test_id`),
  CONSTRAINT `test_questions_ibfk_1` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

-- Дамп структуры для таблица hackaton-test.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `birth_year` year NOT NULL,
  `role` enum('student','teacher') NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `is_email_verified` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

-- Дамп структуры для таблица hackaton-test.user_answers
CREATE TABLE IF NOT EXISTS `user_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `statistic_id` int NOT NULL,
  `question_id` int NOT NULL,
  `user_answer` text NOT NULL,
  `is_correct` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `statistic_id` (`statistic_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `user_answers_ibfk_1` FOREIGN KEY (`statistic_id`) REFERENCES `user_statistics` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `test_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

-- Дамп структуры для таблица hackaton-test.user_statistics
CREATE TABLE IF NOT EXISTS `user_statistics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `test_id` int NOT NULL,
  `score` int NOT NULL,
  `time_taken` int NOT NULL,
  `correct_answers` int NOT NULL,
  `total_questions` int NOT NULL,
  `date_taken` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `test_id` (`test_id`),
  CONSTRAINT `user_statistics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_statistics_ibfk_2` FOREIGN KEY (`test_id`) REFERENCES `tests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Экспортируемые данные не выделены.

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
