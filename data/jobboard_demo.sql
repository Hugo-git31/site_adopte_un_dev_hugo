-- =========================================================
-- Jobboard - Jeu de données DEMO (@test.com) complet
-- Tous les mots de passe = "test" (hashés pbkdf2_sha256 comme l'API)
-- =========================================================

DROP DATABASE IF EXISTS jobboard;
CREATE DATABASE jobboard;
USE jobboard;

-- =========================================================
-- TABLES (identiques au schéma principal)
-- =========================================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name  VARCHAR(100) NOT NULL,
  date_birth DATE NULL,
  city VARCHAR(100) NULL,
  phone VARCHAR(50) NULL,
  contact_email VARCHAR(255) NULL,
  diplomas TEXT NULL,
  experiences TEXT NULL,
  skills TEXT NULL,
  languages TEXT NULL,
  qualities TEXT NULL,
  interests TEXT NULL,
  job_target VARCHAR(255) NULL,
  motivation TEXT NULL,
  links VARCHAR(512) NULL,
  cv_url VARCHAR(512) NULL,
  avatar_url VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  CONSTRAINT fk_profiles_user_id FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_by INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  hq_city VARCHAR(100) NULL,
  sector  VARCHAR(100) NULL,
  description TEXT NULL,
  website VARCHAR(255) NULL,
  social_links TEXT NULL,
  headcount VARCHAR(50) NULL,
  banner_url VARCHAR(512) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_companies_created_by FOREIGN KEY (created_by)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  short_desc TEXT NULL,
  full_desc  TEXT NULL,
  location   VARCHAR(100) NULL,
  profile_sought TEXT NULL,
  contract_type  VARCHAR(50) NULL,
  work_mode      VARCHAR(50) NULL,
  salary_min INT NULL,
  salary_max INT NULL,
  currency VARCHAR(10) NULL,
  tags     TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_company_id FOREIGN KEY (company_id)
    REFERENCES companies (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id  INT NOT NULL,
  user_id INT NULL,
  name  VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(50)  NULL,
  message TEXT NULL,
  cv_url  VARCHAR(512) NULL,
  status  VARCHAR(30) NOT NULL DEFAULT 'new',
  matched_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_applications_job_id  FOREIGN KEY (job_id)
    REFERENCES jobs (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_applications_user_id FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uniq_applications_job_user (job_id, user_id),
  INDEX idx_applications_status (status),
  INDEX idx_applications_job_id (job_id),
  INDEX idx_applications_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  job_id INT NULL,
  application_id INT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notifications_recipient_user_id FOREIGN KEY (recipient_user_id)
    REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_job_id FOREIGN KEY (job_id)
    REFERENCES jobs (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_notifications_application_id FOREIGN KEY (application_id)
    REFERENCES applications (id) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX idx_notifications_recipient_read (recipient_user_id, is_read),
  INDEX idx_notifications_created_at (created_at)
) ENGINE=InnoDB;

-- =========================================================
-- DONNEES DEMO (@test.com)
-- =========================================================

-- Tous les mots de passe = "test"
SET @PWD_TEST := '$pbkdf2-sha256$29000$kvLe27u3lnIOYey9d44Rgg$vVjF6wLUEeGH7POw6ucdInshJOzjG7Tqh9InAlO8MrA';

-- 15 candidats
INSERT INTO users (email, password_hash, role, created_at) VALUES
('candidat1@test.com',  @PWD_TEST, 'user', NOW()),
('candidat2@test.com',  @PWD_TEST, 'user', NOW()),
('candidat3@test.com',  @PWD_TEST, 'user', NOW()),
('candidat4@test.com',  @PWD_TEST, 'user', NOW()),
('candidat5@test.com',  @PWD_TEST, 'user', NOW()),
('candidat6@test.com',  @PWD_TEST, 'user', NOW()),
('candidat7@test.com',  @PWD_TEST, 'user', NOW()),
('candidat8@test.com',  @PWD_TEST, 'user', NOW()),
('candidat9@test.com',  @PWD_TEST, 'user', NOW()),
('candidat10@test.com', @PWD_TEST, 'user', NOW()),
('candidat11@test.com', @PWD_TEST, 'user', NOW()),
('candidat12@test.com', @PWD_TEST, 'user', NOW()),
('candidat13@test.com', @PWD_TEST, 'user', NOW()),
('candidat14@test.com', @PWD_TEST, 'user', NOW()),
('candidat15@test.com', @PWD_TEST, 'user', NOW());

-- 6 recruteurs
INSERT INTO users (email, password_hash, role, created_at) VALUES
('entreprise1@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise2@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise3@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise4@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise5@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise6@test.com', @PWD_TEST, 'recruiter', NOW());

-- 2 admins (total 2 admins max)
INSERT INTO users (email, password_hash, role, created_at) VALUES
('admin1@test.com', @PWD_TEST, 'admin', NOW()),
('admin2@test.com', @PWD_TEST, 'admin', NOW());

-- Profils pour 15 candidats (id 1..15)
INSERT INTO profiles
(user_id, first_name, last_name, date_birth, city, phone, contact_email, diplomas,
 experiences, skills, languages, qualities, interests, job_target,
 motivation, links, cv_url, avatar_url, created_at, updated_at)
VALUES
(1,  'Alex',   'Martin',  '1996-04-12', 'Paris',      '+33 6 11 11 11 11', 'candidat1@test.com',
 'Master Info', '2 ans front', 'JS, React, TS', 'FR,EN', 'Rigoureux', 'Lecture, Yoga',
 'Frontend Dev', 'UX et accessibilité', 'https://linkedin.com/in/candidat1', 'https://cv.example/candidat1',
 'https://picsum.photos/id/1011/300/300', NOW(), NOW()),
(2,  'Bruno',  'Durand',  '1995-05-02', 'Lyon',       '+33 6 22 22 22 22', 'candidat2@test.com',
 'Ingé Info', 'Back Java', 'Java, Spring, SQL', 'FR,EN', 'Consciencieux', 'Escalade',
 'Backend Java', 'Qualité & tests', 'https://github.com/candidat2', 'https://cv.example/candidat2',
 'https://picsum.photos/id/1027/300/300', NOW(), NOW()),
(3,  'Chloé',  'Bernard', '1998-01-05', 'Marseille',  '+33 6 33 33 33 33', 'candidat3@test.com',
 'Licence Info', 'Alternance', 'HTML,CSS,Alpine', 'FR,EN', 'Créative', 'Musique',
 'Intégratrice', 'Volontaire', NULL, 'https://cv.example/candidat3',
 'https://picsum.photos/id/1005/300/300', NOW(), NOW()),
(4,  'Diane',  'Petit',   '1994-12-10', 'Nantes',     '+33 6 44 44 44 44', 'candidat4@test.com',
 'Master Data', '2 ans BI', 'Python,SQL,PowerBI', 'FR,EN', 'Analytique', 'Jeux',
 'Data Analyst', 'Résolutrice', 'https://linkedin.com/in/candidat4', 'https://cv.example/candidat4',
 'https://picsum.photos/id/1001/300/300', NOW(), NOW()),
(5,  'Evan',   'Roche',   '1993-06-30', 'Bordeaux',   '+33 6 55 55 55 55', 'candidat5@test.com',
 'BTS SIO', '3 ans dev', 'PHP,MySQL,Laravel', 'FR,EN', 'Fiable', 'Sport',
 'Fullstack Jr', 'Progression', NULL, 'https://cv.example/candidat5',
 'https://picsum.photos/id/1012/300/300', NOW(), NOW()),
(6,  'Fiona',  'Lemaire', '1997-02-14', 'Toulouse',   '+33 6 66 01 02 03', 'candidat6@test.com',
 'M1 HCI', 'Stage UX', 'Figma, React', 'FR,EN', 'Empathique', 'Design',
 'UX Designer', 'Accessibilité', 'https://behance.net/candidat6', 'https://cv.example/candidat6',
 'https://picsum.photos/id/1025/300/300', NOW(), NOW()),
(7,  'Gaspard','Morel',  '1992-11-02', 'Lille',      '+33 6 67 02 03 04', 'candidat7@test.com',
 'M2 Sécu', '3 ans SOC', 'SIEM, EDR', 'FR,EN', 'Rigoureux', 'CTF',
 'Analyste SOC', 'Pentest à terme', 'https://tryhackme.com/p/candidat7', 'https://cv.example/candidat7',
 'https://picsum.photos/id/237/300/300', NOW(), NOW()),
(8,  'Hannah', 'Leclerc', '1999-07-19', 'Rennes',     '+33 6 68 03 04 05', 'candidat8@test.com',
 'M2 IA', 'Stages ML', 'Python, scikit', 'FR,EN', 'Pédagogue', 'Rando',
 'Data Scientist Jr', 'Modèles propres', 'https://kaggle.com/candidat8', 'https://cv.example/candidat8',
 'https://picsum.photos/id/1014/300/300', NOW(), NOW()),
(9,  'Igor',   'Dumont',  '1991-05-09', 'Strasbourg', '+33 6 69 04 05 06', 'candidat9@test.com',
 'M1 Réseau', 'AdminSys', 'Linux, Ansible, K8s', 'FR,EN', 'Pragmatique', 'DIY',
 'DevOps', 'Automatiser', 'https://gitlab.com/candidat9', 'https://cv.example/candidat9',
 'https://picsum.photos/id/64/300/300', NOW(), NOW()),
(10, 'Julie',  'Royer',   '1994-03-27', 'Nice',       '+33 6 70 05 06 07', 'candidat10@test.com',
 'Licence Design', 'Webdesign', 'UI kits, Tailwind', 'FR,EN', 'Minutieuse', 'Photo',
 'Product Designer', 'Design systems', 'https://dribbble.com/candidat10', 'https://cv.example/candidat10',
 'https://picsum.photos/id/433/300/300', NOW(), NOW()),
(11, 'Kevin',  'Arnaud',  '1990-12-12', 'Grenoble',   '+33 6 71 06 07 08', 'candidat11@test.com',
 'M2 Info', 'Java back', 'Java, Spring, SQL', 'FR,EN', 'Sérieux', 'Ski',
 'Backend Java', 'Robustesse', 'https://github.com/candidat11', 'https://cv.example/candidat11',
 'https://picsum.photos/id/823/300/300', NOW(), NOW()),
(12, 'Léa',    'Boucher', '1998-09-01', 'Montpellier','+33 6 72 07 08 09', 'candidat12@test.com',
 'M2 Marketing', 'Growth', 'SEO, SEA, GA4', 'FR,EN', 'Curieuse', 'Cuisine',
 'Growth Marketer', 'Data-driven', 'https://candidat12.me', 'https://cv.example/candidat12',
 'https://picsum.photos/id/1021/300/300', NOW(), NOW()),
(13, 'Marc',   'Baron',   '1993-01-22', 'Tours',      '+33 6 73 08 09 10', 'candidat13@test.com',
 'M1 Info', 'C#', '.NET, Azure', 'FR,EN', 'Fiable', 'Impression 3D',
 '.NET Dev', 'Cloud first', 'https://github.com/candidat13', 'https://cv.example/candidat13',
 'https://picsum.photos/id/1022/300/300', NOW(), NOW()),
(14, 'Nina',   'Simon',   '1997-10-10', 'Dijon',      '+33 6 74 09 10 11', 'candidat14@test.com',
 'M2 DataViz', 'Reporting', 'D3.js, Tableau', 'FR,EN', 'Créative', 'Piano',
 'DataViz Eng', 'Raconter la data', 'https://nina.dev', 'https://cv.example/candidat14',
 'https://picsum.photos/id/1023/300/300', NOW(), NOW()),
(15, 'Olivier','Ferry',   '1992-06-04', 'Reims',      '+33 6 75 10 11 12', 'candidat15@test.com',
 'Licence Info', 'Sysadmin', 'Bash, Nginx, Postgres', 'FR,EN', 'Carré', 'Auto',
 'SRE', 'SLA & SLO', 'https://status.example', 'https://cv.example/candidat15',
 'https://picsum.photos/id/1024/300/300', NOW(), NOW());

-- 6 entreprises (users 16..21)
INSERT INTO companies (created_by, name, hq_city, sector, description, website, social_links, headcount, banner_url, created_at) VALUES
(16, 'AlphaTech',   'Paris',     'Logiciels', 'Éditeur SaaS B2B',            'https://alphatech.example',   NULL, '50-100',  'https://picsum.photos/id/1047/1200/300', NOW()),
(17, 'BlueShop',    'Lyon',      'E-commerce','Headless commerce',           'https://blueshop.example',    NULL, '20-50',   'https://picsum.photos/id/1039/1200/300', NOW()),
(18, 'DataPulse',   'Nantes',    'Data',      'Conseil Data & IA',           'https://datapulse.example',   NULL, '100-200', 'https://picsum.photos/id/1033/1200/300', NOW()),
(19, 'SecureMind',  'Marseille', 'Sécurité',  'Services cybersécurité',      'https://securemind.example',  NULL, '50-100',  'https://picsum.photos/id/1029/1200/300', NOW()),
(20, 'GreenOps',    'Toulouse',  'Cloud',     'FinOps/Green IT',             'https://greenops.example',    NULL, '100-200', 'https://picsum.photos/id/1050/1200/300', NOW()),
(21, 'HealthHub',   'Rennes',    'Santé',     'SaaS pour cliniques',         'https://healthhub.example',   NULL, '200-500', 'https://picsum.photos/id/1057/1200/300', NOW());

-- 12 offres (2 / entreprise)
INSERT INTO jobs (company_id, title, short_desc, full_desc, location, profile_sought, contract_type, work_mode, salary_min, salary_max, currency, tags, created_at) VALUES
(1, 'Développeur Front React', 'Construire UI SaaS', 'React, TypeScript, tests', 'Paris', 'Autonomie, code propre', 'CDI', 'hybride', 40000, 55000, 'EUR', 'react,ts,frontend', NOW()),
(1, 'QA Engineer',             'Automatiser les tests', 'Playwright/Cypress', 'Paris', 'Esprit qualité', 'CDI', 'remote', 38000, 50000, 'EUR', 'qa,tests,playwright', NOW()),
(2, 'DevOps Cloud',            'CI/CD & IaC', 'K8s, Terraform, observabilité', 'Lyon', 'Ownership, SRE', 'CDI', 'hybride', 45000, 60000, 'EUR', 'k8s,terraform,sre', NOW()),
(2, 'Développeur Node',        'API headless', 'Node, SQL, perf', 'Lyon', 'Culture produit', 'CDI', 'hybride', 42000, 56000, 'EUR', 'node,sql,api', NOW()),
(3, 'Data Analyst',            'Tableaux & ad hoc', 'SQL, PowerBI, data viz', 'Nantes', 'Sens critique', 'CDI', 'hybride', 38000, 48000, 'EUR', 'sql,powerbi,viz', NOW()),
(3, 'Data Scientist Jr',       'ML interprétable', 'pandas, scikit, MLOps', 'Nantes', 'Curiosité', 'CDI', 'remote', 42000, 52000, 'EUR', 'python,ml,mlops', NOW()),
(4, 'Analyste SOC',            'Détection & réponse', 'SIEM, EDR, Threat Hunting', 'Marseille', 'Rigueur', 'CDI', 'site', 38000, 48000, 'EUR', 'soc,edr,blue-team', NOW()),
(4, 'Pentester',               'Tests intru', 'OWASP, Burp, rapport', 'Marseille', 'Pédagogie', 'CDI', 'hybride', 45000, 65000, 'EUR', 'pentest,owasp,burp', NOW()),
(5, 'FinOps Engineer',         'Optimisation coûts cloud', 'Budgets, KPIs, Green IT', 'Toulouse', 'Pragmatisme', 'CDI', 'hybride', 45000, 60000, 'EUR', 'finops,cloud,kpi', NOW()),
(5, 'SRE',                     'Fiabilité & SLO', 'SLO, erreurs budgets', 'Toulouse', 'Curiosité', 'CDI', 'remote', 50000, 65000, 'EUR', 'sre,observability', NOW()),
(6, 'Fullstack TS',            'Produit médical', 'TS/React + FastAPI', 'Rennes', 'Qualité', 'CDI', 'hybride', 45000, 62000, 'EUR', 'react,fastapi,ts', NOW()),
(6, 'Product Designer',        'Design system', 'UI kits, accessibilité', 'Rennes', 'Sens du détail', 'CDI', 'remote', 42000, 56000, 'EUR', 'design,ui,accessibility', NOW());

-- Candidatures (quelques « matched » pour tester les notifs / données révélées)
INSERT INTO applications (job_id, user_id, name, email, phone, message, cv_url, status, matched_at, created_at) VALUES
(1, 1,  NULL, NULL, NULL, 'Motivé par les UI performantes', 'https://cv.example/candidat1',  'new',     NULL, NOW()),
(1, 2,  NULL, NULL, NULL, 'Expérience en tests et qualité', 'https://cv.example/candidat2',  'review',  NULL, NOW()),
(2, 3,  NULL, NULL, NULL, 'Automatisation E2E',             'https://cv.example/candidat3',  'matched', NOW(), NOW()),
(3, 4,  NULL, NULL, NULL, 'Passion infra as code',          'https://cv.example/candidat4',  'new',     NULL, NOW()),
(3, 5,  NULL, NULL, NULL, 'SRE mindset',                    'https://cv.example/candidat5',  'review',  NULL, NOW()),
(4, 6,  NULL, NULL, NULL, 'API perf & SQL',                 'https://cv.example/candidat6',  'new',     NULL, NOW()),
(4, 7,  NULL, NULL, NULL, 'Node & domain driven',           'https://cv.example/candidat7',  'new',     NULL, NOW()),
(5, 8,  NULL, NULL, NULL, 'Analyses ad hoc propres',        'https://cv.example/candidat8',  'new',     NULL, NOW()),
(6, 9,  NULL, NULL, NULL, 'Modèles interprétables',         'https://cv.example/candidat9',  'review',  NULL, NOW()),
(7, 10, NULL, NULL, NULL, 'Blue team et détection',         'https://cv.example/candidat10', 'new',     NULL, NOW()),
(8, 11, NULL, NULL, NULL, 'Rapports clairs',                'https://cv.example/candidat11', 'matched', NOW(), NOW()),
(9, 12, NULL, NULL, NULL, 'Green IT & budgets',             'https://cv.example/candidat12', 'new',     NULL, NOW()),
(10,13, NULL, NULL, NULL, 'SLO & tooling',                  'https://cv.example/candidat13', 'review',  NULL, NOW()),
(11,14, NULL, NULL, NULL, 'Stack TS complète',              'https://cv.example/candidat14', 'new',     NULL, NOW()),
(12,15, NULL, NULL, NULL, 'Design system lover',            'https://cv.example/candidat15', 'new',     NULL, NOW());

-- =========================================================
-- EXTENSION x3: +30 candidats, +12 recruteurs, +12 entreprises, +24 offres, +40 candidatures
-- =========================================================

-- +30 candidats (ids attendus: 24..53)
INSERT INTO users (email, password_hash, role, created_at) VALUES
('candidat16@test.com', @PWD_TEST, 'user', NOW()),
('candidat17@test.com', @PWD_TEST, 'user', NOW()),
('candidat18@test.com', @PWD_TEST, 'user', NOW()),
('candidat19@test.com', @PWD_TEST, 'user', NOW()),
('candidat20@test.com', @PWD_TEST, 'user', NOW()),
('candidat21@test.com', @PWD_TEST, 'user', NOW()),
('candidat22@test.com', @PWD_TEST, 'user', NOW()),
('candidat23@test.com', @PWD_TEST, 'user', NOW()),
('candidat24@test.com', @PWD_TEST, 'user', NOW()),
('candidat25@test.com', @PWD_TEST, 'user', NOW()),
('candidat26@test.com', @PWD_TEST, 'user', NOW()),
('candidat27@test.com', @PWD_TEST, 'user', NOW()),
('candidat28@test.com', @PWD_TEST, 'user', NOW()),
('candidat29@test.com', @PWD_TEST, 'user', NOW()),
('candidat30@test.com', @PWD_TEST, 'user', NOW()),
('candidat31@test.com', @PWD_TEST, 'user', NOW()),
('candidat32@test.com', @PWD_TEST, 'user', NOW()),
('candidat33@test.com', @PWD_TEST, 'user', NOW()),
('candidat34@test.com', @PWD_TEST, 'user', NOW()),
('candidat35@test.com', @PWD_TEST, 'user', NOW()),
('candidat36@test.com', @PWD_TEST, 'user', NOW()),
('candidat37@test.com', @PWD_TEST, 'user', NOW()),
('candidat38@test.com', @PWD_TEST, 'user', NOW()),
('candidat39@test.com', @PWD_TEST, 'user', NOW()),
('candidat40@test.com', @PWD_TEST, 'user', NOW()),
('candidat41@test.com', @PWD_TEST, 'user', NOW()),
('candidat42@test.com', @PWD_TEST, 'user', NOW()),
('candidat43@test.com', @PWD_TEST, 'user', NOW()),
('candidat44@test.com', @PWD_TEST, 'user', NOW()),
('candidat45@test.com', @PWD_TEST, 'user', NOW());

-- +12 recruteurs supplémentaires (ids attendus: 54..65)
INSERT INTO users (email, password_hash, role, created_at) VALUES
('entreprise7@test.com',  @PWD_TEST, 'recruiter', NOW()),
('entreprise8@test.com',  @PWD_TEST, 'recruiter', NOW()),
('entreprise9@test.com',  @PWD_TEST, 'recruiter', NOW()),
('entreprise10@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise11@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise12@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise13@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise14@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise15@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise16@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise17@test.com', @PWD_TEST, 'recruiter', NOW()),
('entreprise18@test.com', @PWD_TEST, 'recruiter', NOW());

-- Profils pour candidats 16..45 (user_id = 24..53)
INSERT INTO profiles
(user_id, first_name, last_name, date_birth, city, phone, contact_email, diplomas,
 experiences, skills, languages, qualities, interests, job_target,
 motivation, links, cv_url, avatar_url, created_at, updated_at)
VALUES
(24, 'Alice',  'Test', '1993-01-01', 'Paris',  '+33 6 60 00 00 01', 'candidat16@test.com', 'Licence', '1 an front',  'JS,Vue', 'FR,EN', 'Curieuse', 'Lecture', 'Frontend', 'Pixel perfect', 'https://linkedin.com/in/c16', 'https://cv.example/c16', 'https://picsum.photos/id/10/300/300', NOW(), NOW()),
(25, 'Benoit', 'Test', '1992-02-02', 'Lyon',   '+33 6 60 00 00 02', 'candidat17@test.com', 'Master',  '2 ans back',  'Java,SQL', 'FR,EN', 'Rigoureux','Escalade','Backend',  'Clean code',    'https://github.com/c17',      'https://cv.example/c17', 'https://picsum.photos/id/11/300/300', NOW(), NOW()),
(26, 'Chadi',  'Test', '1991-03-03', 'Nantes', '+33 6 60 00 00 03', 'candidat18@test.com', 'M1',     'Stagiaire',   'HTML,CSS', 'FR,EN', 'Créatif', 'Musique','Intégration','Soigné',        NULL,                      'https://cv.example/c18', 'https://picsum.photos/id/12/300/300', NOW(), NOW()),
(27, 'Dora',   'Test', '1990-04-04', 'Bordeaux','+33 6 60 00 00 04', 'candidat19@test.com', 'M2 Data','1 an BI',   'Python,SQL','FR,EN','Analytique','Jeux','Data Analyst','Résultats', 'https://linkedin.com/in/c19','https://cv.example/c19','https://picsum.photos/id/13/300/300', NOW(), NOW()),
(28, 'Eliot',  'Test', '1989-05-05', 'Toulouse','+33 6 60 00 00 05', 'candidat20@test.com', 'BTS',   '2 ans PHP',  'PHP,MySQL','FR,EN','Fiable', 'Sport', 'Fullstack', 'Apprentissage', NULL, 'https://cv.example/c20','https://picsum.photos/id/14/300/300', NOW(), NOW()),
(29, 'Fleur',  'Test', '1998-06-06', 'Rennes', '+33 6 60 00 00 06', 'candidat21@test.com', 'M1 HCI','Stage UX',   'Figma,UX', 'FR,EN','Empathique','Design','UX Designer','Accessibilité','https://behance.net/c21','https://cv.example/c21','https://picsum.photos/id/15/300/300', NOW(), NOW()),
(30, 'Gabin',  'Test', '1997-07-07', 'Lille',  '+33 6 60 00 00 07', 'candidat22@test.com', 'M2 Secu','3 ans SOC', 'SIEM,EDR', 'FR,EN','Rigoureux','CTF','Analyste SOC','Pentest', 'https://tryhackme.com/p/c22','https://cv.example/c22','https://picsum.photos/id/16/300/300', NOW(), NOW()),
(31, 'Hana',   'Test', '1996-08-08', 'Rennes', '+33 6 60 00 00 08', 'candidat23@test.com', 'M2 IA', 'Stages ML',  'Py,sklearn','FR,EN','Pédagogue','Rando','Data Sci Jr','Modèles propres','https://kaggle.com/c23','https://cv.example/c23','https://picsum.photos/id/17/300/300', NOW(), NOW()),
(32, 'Ilan',   'Test', '1995-09-09', 'Strasbourg','+33 6 60 00 00 09','candidat24@test.com','M1 Réseau','AdminSys','Linux,K8s', 'FR,EN','Pragmatique','DIY','DevOps','Automatisation','https://gitlab.com/c24','https://cv.example/c24','https://picsum.photos/id/18/300/300', NOW(), NOW()),
(33, 'Jade',   'Test', '1994-10-10','Nice',    '+33 6 60 00 00 10','candidat25@test.com','Licence','Webdesign','UI,Tailwind','FR,EN','Minutieuse','Photo','Product Design','Design systems','https://dribbble.com/c25','https://cv.example/c25','https://picsum.photos/id/19/300/300', NOW(), NOW()),
(34, 'Karl',   'Test', '1993-11-11','Grenoble','+33 6 60 00 00 11','candidat26@test.com','M2 Info','Java back','Java,Spring','FR,EN','Sérieux','Ski','Backend Java','Robustesse','https://github.com/c26','https://cv.example/c26','https://picsum.photos/id/20/300/300', NOW(), NOW()),
(35, 'Lina',   'Test', '1992-12-12','Montpellier','+33 6 60 00 00 12','candidat27@test.com','M2 Marketing','Growth','SEO,SEA','FR,EN','Curieuse','Cuisine','Growth','Data-driven','https://c27.me','https://cv.example/c27','https://picsum.photos/id/21/300/300', NOW(), NOW()),
(36, 'Marc',   'Test', '1991-01-13','Tours',   '+33 6 60 00 00 13','candidat28@test.com','M1','C#','.NET,Azure','FR,EN','Fiable','Impr.3D','.NET Dev','Cloud first','https://github.com/c28','https://cv.example/c28','https://picsum.photos/id/22/300/300', NOW(), NOW()),
(37, 'Nora',   'Test', '1990-02-14','Dijon',   '+33 6 60 00 00 14','candidat29@test.com','M2 DataViz','Reporting','D3,Tableau','FR,EN','Créative','Piano','DataViz','Storytelling','https://nora.dev','https://cv.example/c29','https://picsum.photos/id/23/300/300', NOW(), NOW()),
(38, 'Omar',   'Test', '1989-03-15','Reims',   '+33 6 60 00 00 15','candidat30@test.com','Licence','Sysadmin','Bash,Nginx','FR,EN','Carré','Auto','SRE','SLA & SLO','https://status.c30','https://cv.example/c30','https://picsum.photos/id/24/300/300', NOW(), NOW()),
(39, 'Paula',  'Test', '1998-04-16','Angers',  '+33 6 60 00 00 16','candidat31@test.com','M2 Info','QA','Cypress,Playwright','FR,EN','Exigeante','Scrapbook','QA','Zéro régression','https://paula.qa','https://cv.example/c31','https://picsum.photos/id/25/300/300', NOW(), NOW()),
(40, 'Quinn',  'Test', '1997-05-17','Clermont','+33 6 60 00 00 17','candidat32@test.com','M1 Info','Go','Go,gRPC','FR,EN','Discret','Chess','Go Backend','Perf','https://github.com/c32','https://cv.example/c32','https://picsum.photos/id/26/300/300', NOW(), NOW()),
(41, 'Rita',   'Test', '1996-06-18','Metz',    '+33 6 60 00 00 18','candidat33@test.com','BUT Info','Alt. front','Vue,Pinia','FR,EN','Soignée','Danse','Frontend Vue','Design systems','https://r33.codes','https://cv.example/c33','https://picsum.photos/id/27/300/300', NOW(), NOW()),
(42, 'Sam',    'Test', '1995-07-19','Rouen',   '+33 6 60 00 00 19','candidat34@test.com','M2 Sécu','Pentest','Burp,OWASP','FR,EN','Tenace','Boxe','Pentester','Rapports clairs','https://sam.red','https://cv.example/c34','https://picsum.photos/id/28/300/300', NOW(), NOW()),
(43, 'Tess',   'Test', '1994-08-20','Poitiers','+33 6 60 00 00 20','candidat35@test.com','M2 Produit','PM','Roadmap,KPI','FR,EN','Synthétique','Voyage','PM','Impact user','https://tess.pm','https://cv.example/c35','https://picsum.photos/id/29/300/300', NOW(), NOW()),
(44, 'Uma',    'Test', '1993-09-21','Paris',   '+33 6 60 00 00 21','candidat36@test.com','M1 UX','Design','Figma,UX','FR,EN','Empathie','Art','Product Design','A11y','https://u36.design','https://cv.example/c36','https://picsum.photos/id/30/300/300', NOW(), NOW()),
(45, 'Victor', 'Test', '1992-10-22','Lyon',    '+33 6 60 00 00 22','candidat37@test.com','M2 Data','BI','SQL,dbt','FR,EN','Pédagogue','Lecture','Data Eng','Pipelines','https://v37.data','https://cv.example/c37','https://picsum.photos/id/31/300/300', NOW(), NOW()),
(46, 'Wafa',   'Test', '1991-11-23','Nantes',  '+33 6 60 00 00 23','candidat38@test.com','M2 Cloud','DevOps','K8s,Terraform','FR,EN','Curieuse','Sport','DevOps','IaC','https://w38.devops','https://cv.example/c38','https://picsum.photos/id/32/300/300', NOW(), NOW()),
(47, 'Xena',   'Test', '1990-12-24','Toulouse','+33 6 60 00 00 24','candidat39@test.com','M2 SecOps','AppSec','SAST,DAST','FR,EN','Tenace','Course','AppSec','SDLC','https://x39.appsec','https://cv.example/c39','https://picsum.photos/id/33/300/300', NOW(), NOW()),
(48, 'Yanis',  'Test', '1999-01-25','Rennes',  '+33 6 60 00 00 25','candidat40@test.com','Licence','Front','Svelte,TS','FR,EN','Rapide','Jeux','Frontend','UI/UX','https://y40.front','https://cv.example/c40','https://picsum.photos/id/34/300/300', NOW(), NOW()),
(49, 'Zoé',    'Test', '1998-02-26','Lille',   '+33 6 60 00 00 26','candidat41@test.com','M1 AI','ML','pytorch,cv','FR,EN','Créative','IA','ML Eng','Explainable','https://z41.ml','https://cv.example/c41','https://picsum.photos/id/35/300/300', NOW(), NOW()),
(50, 'Arno',   'Test', '1997-03-27','Marseille','+33 6 60 00 00 27','candidat42@test.com','M2 Dev','Fullstack','TS,Node','FR,EN','Polyvalent','Musique','Fullstack','DDD','https://a42.dev','https://cv.example/c42','https://picsum.photos/id/36/300/300', NOW(), NOW()),
(51, 'Bella',  'Test', '1996-04-28','Bordeaux','+33 6 60 00 00 28','candidat43@test.com','BUT','DataViz','D3,Charts','FR,EN','Créative','Photo','DataViz','Story', 'https://b43.dataviz','https://cv.example/c43','https://picsum.photos/id/37/300/300', NOW(), NOW()),
(52, 'Cyril',  'Test', '1995-05-29','Nice',    '+33 6 60 00 00 29','candidat44@test.com','M1','Sysadmin','Linux,Net','FR,EN','Carré','Auto','SRE','SLO','https://c44.sre','https://cv.example/c44','https://picsum.photos/id/38/300/300', NOW(), NOW()),
(53, 'Dana',   'Test', '1994-06-30','Paris',   '+33 6 60 00 00 30','candidat45@test.com','M2','QA','Tests','FR,EN','Exigeante','Lecture','QA','Qualité', 'https://d45.qa','https://cv.example/c45','https://picsum.photos/id/39/300/300', NOW(), NOW());

-- +12 entreprises supplémentaires (ids attendus: 7..18) créées par recruteurs 54..65
INSERT INTO companies (created_by, name, hq_city, sector, description, website, social_links, headcount, banner_url, created_at) VALUES
(54, 'NeoBank',      'Paris',     'Fintech',   'API bancaire',          'https://neobank.example',     NULL, '200-500','https://picsum.photos/id/40/1200/300', NOW()),
(55, 'MobilityX',    'Lille',     'Mobilité',  'MaaS',                  'https://mobilityx.example',   NULL, '50-100', 'https://picsum.photos/id/41/1200/300', NOW()),
(56, 'WebForge',     'Bordeaux',  'Agence',    'Web full-service',      'https://webforge.example',    NULL, '10-20',  'https://picsum.photos/id/42/1200/300', NOW()),
(57, 'BlueCart',     'Toulouse',  'E-commerce','Headless',              'https://bluecart.example',    NULL, '100-200','https://picsum.photos/id/43/1200/300', NOW()),
(58, 'AgriTech',     'Lyon',      'AgriTech',  'IoT fermes',            'https://agritech.example',    NULL, '20-50',  'https://picsum.photos/id/44/1200/300', NOW()),
(59, 'EduLearn',     'Rennes',    'EdTech',    'Plateforme LMS',        'https://edulearn.example',    NULL, '50-100', 'https://picsum.photos/id/45/1200/300', NOW()),
(60, 'TravelNow',    'Paris',     'Voyage',    'Booking',               'https://travelnow.example',   NULL, '100-200','https://picsum.photos/id/46/1200/300', NOW()),
(61, 'MediaHub',     'Marseille', 'Média',     'Streaming',             'https://mediahub.example',    NULL, '200-500','https://picsum.photos/id/47/1200/300', NOW()),
(62, 'BuildIt',      'Nantes',    'BTP',       'Gestion chantiers',     'https://buildit.example',     NULL, '50-100', 'https://picsum.photos/id/48/1200/300', NOW()),
(63, 'HealTech',     'Montpellier','Santé',    'Dossier patient',       'https://healtech.example',    NULL, '50-100', 'https://picsum.photos/id/49/1200/300', NOW()),
(64, 'FinScope',     'Grenoble',  'Finance',   'Scoring crédit',        'https://finscope.example',    NULL, '20-50',  'https://picsum.photos/id/50/1200/300', NOW()),
(65, 'Foodly',       'Dijon',     'FoodTech',  'Livraison repas',       'https://foodly.example',      NULL, '100-200','https://picsum.photos/id/51/1200/300', NOW());

-- +24 offres (2 par entreprise id 7..18)
INSERT INTO jobs (company_id, title, short_desc, full_desc, location, profile_sought, contract_type, work_mode, salary_min, salary_max, currency, tags, created_at) VALUES
(7,  'Ingénieur Backend', 'API fintech', 'Go/Java, sécurité', 'Paris', 'Qualité', 'CDI', 'hybride', 50000, 70000, 'EUR', 'go,java,api', NOW()),
(7,  'Frontend React',    'Onboarding', 'Design system', 'Paris', 'UX', 'CDI', 'remote', 42000, 56000, 'EUR', 'react,ui,accessibility', NOW()),
(8,  'Android Engineer',  'App mobilité', 'Kotlin, BLE', 'Lille', 'Autonomie', 'CDI', 'site', 45000, 60000, 'EUR', 'android,kotlin,ble', NOW()),
(8,  'Data Engineer',     'Trajets', 'Pipelines, ETL', 'Lille', 'Rigueur', 'CDI', 'hybride', 48000, 62000, 'EUR', 'python,etl,dbt', NOW()),
(9,  'Chef de projet',     'Web projets', 'Organisation, CRM', 'Bordeaux', 'Leadership', 'CDI', 'hybride', 42000, 54000, 'EUR', 'crm,pm,agile', NOW()),
(9,  'Fullstack PHP',      'Sites e-com', 'Symfony', 'Bordeaux', 'Qualité', 'CDI', 'remote', 38000, 52000, 'EUR', 'php,symfony,fullstack', NOW()),
(10, 'SRE',                'Perf panier', 'SLO, SLI', 'Toulouse', 'Curieux', 'CDI', 'hybride', 52000, 68000, 'EUR', 'sre,observability,k8s', NOW()),
(10, 'UX Designer',        'Checkout', 'A/B test', 'Toulouse', 'Empathie', 'CDI', 'remote', 42000, 56000, 'EUR', 'ux,abtest,design', NOW()),
(11, 'IoT Engineer',       'Capteurs', 'LoRa, Zigbee', 'Lyon', 'Créatif', 'CDI', 'site', 45000, 60000, 'EUR', 'iot,embedded', NOW()),
(11, 'Fullstack Node',     'Analytics', 'Node, TS', 'Lyon', 'Autonome', 'CDI', 'hybride', 46000, 60000, 'EUR', 'node,ts,analytics', NOW()),
(12, 'Dev Front Vue',      'E-learning', 'Vue3, Pinia', 'Rennes', 'Soigné', 'CDI', 'remote', 42000, 56000, 'EUR', 'vue,pinia,front', NOW()),
(12, 'QA',                 'Plateforme', 'Playwright', 'Rennes', 'Exigeant', 'CDI', 'hybride', 40000, 52000, 'EUR', 'qa,playwright', NOW()),
(13, 'Product Manager',    'Booking', 'Discovery', 'Paris', 'Synthèse', 'CDI', 'hybride', 55000, 75000, 'EUR', 'product,discovery', NOW()),
(13, 'Backend Python',     'Pricing', 'Django, API', 'Paris', 'Qualité', 'CDI', 'remote', 48000, 64000, 'EUR', 'python,django,api', NOW()),
(14, 'Video Engineer',     'Streaming', 'FFmpeg', 'Marseille', 'Perf', 'CDI', 'hybride', 52000, 70000, 'EUR', 'ffmpeg,video', NOW()),
(14, 'Frontend Web',       'Player', 'Canvas, UI', 'Marseille', 'Créa', 'CDI', 'remote', 42000, 56000, 'EUR', 'canvas,frontend', NOW()),
(15, 'Chef de chantier',   'BTP', 'Planif', 'Nantes', 'Rigueur', 'CDI', 'site', 42000, 56000, 'EUR', 'btp,planning', NOW()),
(15, 'Fullstack TS',       'App mobile', 'React Native', 'Nantes', 'Polyvalent', 'CDI', 'hybride', 46000, 62000, 'EUR', 'react-native,ts', NOW()),
(16, 'Data Engineer',      'Santé', 'Pipelines, GDPR', 'Montpellier', 'Qualité', 'CDI', 'hybride', 50000, 66000, 'EUR', 'python,etl,gdpr', NOW()),
(16, 'Frontend Angular',   'Portail', 'Angular, RXJS', 'Montpellier', 'Soigné', 'CDI', 'remote', 42000, 56000, 'EUR', 'angular,rxjs', NOW()),
(17, 'Quant Dev',          'Finance', 'C++/Python', 'Grenoble', 'Maths', 'CDI', 'site', 60000, 80000, 'EUR', 'c++,python', NOW()),
(17, 'Ops Cloud',          'Batchs', 'GCP, Kubernetes', 'Grenoble', 'Sérieux', 'CDI', 'hybride', 52000, 68000, 'EUR', 'gcp,k8s,ops', NOW()),
(18, 'Logistique Lead',    'Food', 'Routage', 'Dijon', 'Leader', 'CDI', 'site', 46000, 62000, 'EUR', 'logistics,routing', NOW()),
(18, 'iOS Engineer',       'App client', 'SwiftUI', 'Dijon', 'Autonomie', 'CDI', 'hybride', 52000, 70000, 'EUR', 'ios,swiftui', NOW());

-- +40 candidatures supplémentaires (inclure matched/review)
INSERT INTO applications (job_id, user_id, name, email, phone, message, cv_url, status, matched_at, created_at) VALUES
(13, 24, NULL, NULL, NULL, 'Fintech côté front', 'https://cv.example/c16', 'new', NULL, NOW()),
(14, 25, NULL, NULL, NULL, 'Design system', 'https://cv.example/c17', 'review', NULL, NOW()),
(15, 26, NULL, NULL, NULL, 'Kotlin BLE', 'https://cv.example/c18', 'new', NULL, NOW()),
(16, 27, NULL, NULL, NULL, 'DBT pipelines', 'https://cv.example/c19', 'matched', NOW(), NOW()),
(17, 28, NULL, NULL, NULL, 'PM CRM', 'https://cv.example/c20', 'new', NULL, NOW()),
(18, 29, NULL, NULL, NULL, 'Symfony & perfs', 'https://cv.example/c21', 'review', NULL, NOW()),
(19, 30, NULL, NULL, NULL, 'SRE budgets erreurs', 'https://cv.example/c22', 'new', NULL, NOW()),
(20, 31, NULL, NULL, NULL, 'A/B tests', 'https://cv.example/c23', 'matched', NOW(), NOW()),
(21, 32, NULL, NULL, NULL, 'IoT capteurs', 'https://cv.example/c24', 'new', NULL, NOW()),
(22, 33, NULL, NULL, NULL, 'Fullstack Node', 'https://cv.example/c25', 'review', NULL, NOW()),
(23, 34, NULL, NULL, NULL, 'Vue 3 & Pinia', 'https://cv.example/c26', 'new', NULL, NOW()),
(24, 35, NULL, NULL, NULL, 'QA E2E', 'https://cv.example/c27', 'new', NULL, NOW()),
(25, 36, NULL, NULL, NULL, 'Product discovery', 'https://cv.example/c28', 'matched', NOW(), NOW()),
(26, 37, NULL, NULL, NULL, 'Django API', 'https://cv.example/c29', 'new', NULL, NOW()),
(27, 38, NULL, NULL, NULL, 'FFmpeg tuning', 'https://cv.example/c30', 'review', NULL, NOW()),
(28, 39, NULL, NULL, NULL, 'Canvas UI', 'https://cv.example/c31', 'new', NULL, NOW()),
(29, 40, NULL, NULL, NULL, 'Planification', 'https://cv.example/c32', 'new', NULL, NOW()),
(30, 41, NULL, NULL, NULL, 'React Native', 'https://cv.example/c33', 'review', NULL, NOW()),
(31, 42, NULL, NULL, NULL, 'Pipelines santé', 'https://cv.example/c34', 'matched', NOW(), NOW()),
(32, 43, NULL, NULL, NULL, 'Angular RXJS', 'https://cv.example/c35', 'new', NULL, NOW()),
(33, 44, NULL, NULL, NULL, 'Quant dev', 'https://cv.example/c36', 'review', NULL, NOW()),
(34, 45, NULL, NULL, NULL, 'Ops GCP', 'https://cv.example/c37', 'new', NULL, NOW()),
(35, 46, NULL, NULL, NULL, 'Routage logistique', 'https://cv.example/c38', 'matched', NOW(), NOW()),
(36, 47, NULL, NULL, NULL, 'SwiftUI', 'https://cv.example/c39', 'new', NULL, NOW()),
(1,  48, NULL, NULL, NULL, 'React performance', 'https://cv.example/c40', 'review', NULL, NOW()),
(2,  49, NULL, NULL, NULL, 'QA culture', 'https://cv.example/c41', 'new', NULL, NOW()),
(3,  50, NULL, NULL, NULL, 'IaC mindset', 'https://cv.example/c42', 'new', NULL, NOW()),
(4,  51, NULL, NULL, NULL, 'API perf SQL', 'https://cv.example/c43', 'matched', NOW(), NOW()),
(5,  52, NULL, NULL, NULL, 'Ad hoc analyses', 'https://cv.example/c44', 'review', NULL, NOW()),
(6,  53, NULL, NULL, NULL, 'Modèles interprétables', 'https://cv.example/c45', 'new', NULL, NOW()),
(10, 24, NULL, NULL, NULL, 'SLO love', 'https://cv.example/c16', 'new', NULL, NOW()),
(11, 25, NULL, NULL, NULL, 'TS stack', 'https://cv.example/c17', 'review', NULL, NOW()),
(12, 26, NULL, NULL, NULL, 'Design systems', 'https://cv.example/c18', 'new', NULL, NOW()),
(8,  27, NULL, NULL, NULL, 'Rapports clairs', 'https://cv.example/c19', 'matched', NOW(), NOW()),
(9,  28, NULL, NULL, NULL, 'Green IT', 'https://cv.example/c20', 'new', NULL, NOW()),
(7,  29, NULL, NULL, NULL, 'Blue team', 'https://cv.example/c21', 'review', NULL, NOW()),
(12, 30, NULL, NULL, NULL, 'Design system lover', 'https://cv.example/c22', 'new', NULL, NOW()),
(18, 31, NULL, NULL, NULL, 'Symfony E2E', 'https://cv.example/c23', 'new', NULL, NOW());

-- Regénère les notifications pour toutes les candidatures « matched »
DELETE FROM notifications;
INSERT INTO notifications (recipient_user_id, type, message, job_id, application_id, created_at)
SELECT user_id, 'application:matched', 'Votre candidature a été acceptée.', job_id, id, NOW()
FROM applications WHERE status='matched';

-- Vérifs rapides
SELECT COUNT(*) AS nb_users FROM users;
SELECT COUNT(*) AS nb_profiles FROM profiles;
SELECT COUNT(*) AS nb_companies FROM companies;
SELECT COUNT(*) AS nb_jobs FROM jobs;
SELECT COUNT(*) AS nb_applications FROM applications;
