-- =========================================================
-- Jobboard - Schema + Jeu de données (corrigé)
-- =========================================================

DROP DATABASE IF EXISTS jobboard;
CREATE DATABASE jobboard;
USE jobboard;

-- ⚠️ À adapter selon ton environnement:
-- CREATE USER 'jb_user'@'localhost' IDENTIFIED BY 'NouveauMot2Passe!Fort';
-- GRANT ALL PRIVILEGES ON jobboard.* TO 'jb_user'@'localhost';
-- FLUSH PRIVILEGES;

-- =========================================================
-- TABLES
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
-- DONNEES DE TEST ETENDUES (images aléatoires)
-- =========================================================

-- ---------- USERS ---------
INSERT INTO users (email, password_hash, role, created_at) VALUES
('alice@example.com',      'hash_alice',      'user',  NOW()),
('bob@example.com',        'hash_bob',        'admin', NOW()),
('charlie@example.com',    'hash_charlie',    'user',  NOW()),
('diana@example.com',      'hash_diana',      'user',  NOW()),
('eric@example.com',       'hash_eric',       'user',  NOW()),
('fiona@example.com',      'hash_fiona',      'user',  NOW()),
('georges@example.com',    'hash_georges',    'user',  NOW()),
('hannah@example.com',     'hash_hannah',     'user',  NOW()),
('igor@example.com',       'hash_igor',       'user',  NOW()),
('julie@example.com',      'hash_julie',      'user',  NOW()),
('kevin@example.com',      'hash_kevin',      'user',  NOW()),
('lea@example.com',        'hash_lea',        'user',  NOW()),
('marc@example.com',       'hash_marc',       'user',  NOW()),
('nina@example.com',       'hash_nina',       'user',  NOW()),
('olivier@example.com',    'hash_olivier',    'user',  NOW()),
('pauline@example.com',    'hash_pauline',    'user',  NOW()),
('quentin@example.com',    'hash_quentin',    'user',  NOW()),
('rachel@example.com',     'hash_rachel',     'user',  NOW()),
('samir@example.com',      'hash_samir',      'user',  NOW()),
('tess@example.com',       'hash_tess',       'user',  NOW());

-- ---------- PROFILES ----------
INSERT INTO profiles
(user_id, first_name, last_name, date_birth, city, phone, contact_email, diplomas,
 experiences, skills, languages, qualities, interests, job_target,
 motivation, links, cv_url, avatar_url, created_at, updated_at)
VALUES
(1,  'Alice',  'Martin',   '1996-04-12', 'Paris',      '+33 6 11 11 11 11', 'alice@example.com',
 'Master Info', '2 ans dev front', 'JS, React, TS', 'FR,EN', 'Rigoureuse', 'Lecture, Yoga',
 'Frontend Dev', 'Passionnée par l’UX', 'https://linkedin.com/in/alice-m', 'https://cv.example/alice',
 'https://picsum.photos/id/1011/300/300', NOW(), NOW()),
(2,  'Bob',    'Durand',   '1990-08-21', 'Lyon',       '+33 6 22 22 22 22', 'bob@example.com',
 'Ingé Info', '5 ans lead', 'Node, SQL, Docker', 'FR,EN', 'Leader', 'Escalade',
 'Tech Lead', 'Envie de manager', 'https://github.com/bob', 'https://cv.example/bob',
 'https://picsum.photos/id/1027/300/300', NOW(), NOW()),
(3,  'Charlie','Bernard',  '1998-01-05', 'Marseille',  '+33 6 33 33 33 33', 'charlie@example.com',
 'Licence Info','Stages dev', 'HTML,CSS,Alpine', 'FR,EN','Créatif','Musique',
 'Intégrateur','Curieux et motivé', NULL, 'https://cv.example/charlie',
 'https://picsum.photos/id/1005/300/300', NOW(), NOW()),
(4,  'Diana',  'Petit',    '1995-12-10', 'Nantes',     '+33 6 44 44 44 44', 'diana@example.com',
 'Master Data','2 ans BI','Python,SQL,PowerBI','FR,EN','Analytique','Jeux de société',
 'Data Analyst','Aime les défis data','https://linkedin.com/in/diana-p', 'https://cv.example/diana',
 'https://picsum.photos/id/1001/300/300', NOW(), NOW()),
(5,  'Eric',   'Roche',    '1993-06-30', 'Bordeaux',   '+33 6 55 55 55 55', 'eric@example.com',
 'BTS SIO','3 ans support + dev','PHP,MySQL,Laravel','FR,EN','Fiable','Sport',
 'Fullstack Jr','Veut progresser', NULL, 'https://cv.example/eric',
 'https://picsum.photos/id/1012/300/300', NOW(), NOW()),
(6,  'Fiona',  'Lemaire',  '1997-02-14', 'Toulouse',   '+33 6 66 01 02 03', 'fiona@example.com',
 'M1 HCI','Stage UX','Figma, ProtoPie, React','FR,EN','Empathique','Design',
 'UX Designer','Obsédée par l’accessibilité','https://behance.net/fiona', 'https://cv.example/fiona',
 'https://picsum.photos/id/1025/300/300', NOW(), NOW()),
(7,  'Georges','Morel',    '1992-11-02', 'Lille',      '+33 6 67 02 03 04', 'georges@example.com',
 'M2 Sécu','3 ans SOC','SIEM, EDR, ThreatHunt','FR,EN','Rigoureux','CTF',
 'Analyste SOC','Veut monter en pentest','https://tryhackme.com/p/georges', 'https://cv.example/georges',
 'https://picsum.photos/id/237/300/300', NOW(), NOW()),
(8,  'Hannah', 'Leclerc',  '1999-07-19', 'Rennes',     '+33 6 68 03 04 05', 'hannah@example.com',
 'M2 IA','Stages ML','Python, scikit, pandas','FR,EN','Pédagogue','Randonnée',
 'Data Scientist Jr','Aime les modèles propres','https://kaggle.com/hannah', 'https://cv.example/hannah',
 'https://picsum.photos/id/1014/300/300', NOW(), NOW()),
(9,  'Igor',   'Dumont',   '1991-05-09', 'Strasbourg', '+33 6 69 04 05 06', 'igor@example.com',
 'M1 Réseau','AdminSys','Linux, Ansible, K8s','FR,EN','Pragmatique','DIY',
 'DevOps','Automatiser tout','https://gitlab.com/igor', 'https://cv.example/igor',
 'https://picsum.photos/id/64/300/300', NOW(), NOW()),
(10, 'Julie',  'Royer',    '1994-03-27', 'Nice',       '+33 6 70 05 06 07', 'julie@example.com',
 'Licence Design','Webdesign','UI kits, Tailwind','FR,EN','Minutie','Photo',
 'Product Designer','Pixel perfect','https://dribbble.com/julie', 'https://cv.example/julie',
 'https://picsum.photos/id/433/300/300', NOW(), NOW()),
(11, 'Kevin',  'Arnaud',   '1990-12-12', 'Grenoble',   '+33 6 71 06 07 08', 'kevin@example.com',
 'M2 Info','Java back','Java, Spring, SQL','FR,EN','Consciencieux','Ski',
 'Backend Java','Qualité & tests','https://github.com/kevin-a', 'https://cv.example/kevin',
 'https://picsum.photos/id/823/300/300', NOW(), NOW()),
(12, 'Léa',    'Boucher',  '1998-09-01', 'Montpellier','+33 6 72 07 08 09', 'lea@example.com',
 'M2 Marketing','Growth','SEO, SEA, GA4','FR,EN','Curieuse','Cuisine',
 'Growth Marketer','Data-driven','https://lea.me', 'https://cv.example/lea',
 'https://picsum.photos/id/1021/300/300', NOW(), NOW()),
(13, 'Marc',   'Baron',    '1993-01-22', 'Tours',      '+33 6 73 08 09 10', 'marc@example.com',
 'M1 Info','C#','C#, .NET, Azure','FR,EN','Fiable','Impression 3D',
 '.NET Dev','Cloud first','https://github.com/mbaron', 'https://cv.example/marc',
 'https://picsum.photos/id/1022/300/300', NOW(), NOW()),
(14, 'Nina',   'Simon',    '1997-10-10', 'Dijon',      '+33 6 74 09 10 11', 'nina@example.com',
 'M2 DataViz','Reporting','Tableau, D3.js','FR,EN','Créative','Piano',
 'DataViz Eng','Raconter par la data','https://nina.dev', 'https://cv.example/nina',
 'https://picsum.photos/id/1023/300/300', NOW(), NOW()),
(15, 'Olivier','Ferry',    '1992-06-04', 'Reims',      '+33 6 75 10 11 12', 'olivier@example.com',
 'Licence Info','Sysadmin','Bash, Nginx, Postgres','FR,EN','Carré','Auto',
 'SRE','SLA & SLO','https://status.example', 'https://cv.example/olivier',
 'https://picsum.photos/id/1024/300/300', NOW(), NOW()),
(16, 'Pauline','Giraud',   '1996-11-30', 'Angers',     '+33 6 76 11 12 13', 'pauline@example.com',
 'M2 Info','QA','Cypress, Playwright','FR,EN','Exigeante','Scrapbooking',
 'QA Engineer','Zéro régression','https://pauline.qa', 'https://cv.example/pauline',
 'https://picsum.photos/id/1020/300/300', NOW(), NOW()),
(17, 'Quentin','Lambert',  '1995-02-02', 'Clermont-Fd','+33 6 77 12 13 14', 'quentin@example.com',
 'M1 Info','Go','Go, gRPC, Kafka','FR,EN','Discret','Chess',
 'Go Backend','Perf & scalabilité','https://github.com/q-lam', 'https://cv.example/quentin',
 'https://picsum.photos/id/1062/300/300', NOW(), NOW()),
(18, 'Rachel', 'Noël',     '1999-01-15', 'Metz',       '+33 6 78 13 14 15', 'rachel@example.com',
 'BUT Info','Alt. front','Vue, Pinia, Vitest','FR,EN','Soignée','Danse',
 'Frontend Vue','Design systems','https://rachel.codes', 'https://cv.example/rachel',
 'https://picsum.photos/id/1069/300/300', NOW(), NOW()),
(19, 'Samir',  'Aït',      '1994-08-08', 'Rouen',      '+33 6 79 14 15 16', 'samir@example.com',
 'M2 Sécu','Pentest','Burp, Nmap, OSINT','FR,EN','Tenace','Boxe',
 'Pentester','Rapports clairs','https://samir.red', 'https://cv.example/samir',
 'https://picsum.photos/id/1074/300/300', NOW(), NOW()),
(20, 'Tess',   'Henry',    '1997-04-18', 'Poitiers',   '+33 6 80 15 16 17', 'tess@example.com',
 'M2 Produit','PM','Roadmap, KPI, discovery','FR,EN','Synthétique','Voyage',
 'Product Manager','Impact utilisateur','https://tess.pm', 'https://cv.example/tess',
 'https://picsum.photos/id/1084/300/300', NOW(), NOW());

-- ---------- COMPANIES ----------
INSERT INTO companies (created_by, name, hq_city, sector, description, website, social_links, headcount, banner_url, created_at) VALUES
(2,  'TechNova',        'Paris',      'Logiciels', 'Éditeur SaaS B2B',                  'https://technova.example',   NULL,        '50-100',  'https://picsum.photos/id/1047/1200/300', NOW()),
(3,  'GreenOps',        'Lyon',       'Cloud',     'FinOps/Green IT',                   'https://greenops.example',   NULL,        '20-50',   'https://picsum.photos/id/1039/1200/300', NOW()),
(4,  'DataPulse',       'Nantes',     'Data',      'Conseil Data & IA',                 'https://datapulse.example',  NULL,        '100-200', 'https://picsum.photos/id/1033/1200/300', NOW()),
(5,  'WebForge',        'Bordeaux',   'Agence',    'Agence web full-service',           'https://webforge.example',   NULL,        '10-20',   'https://picsum.photos/id/1032/1200/300', NOW()),
(6,  'SecureMind',      'Marseille',  'Sécurité',  'Cybersecurity services',            'https://securemind.example', NULL,        '50-100',  'https://picsum.photos/id/1029/1200/300', NOW()),
(7,  'BlueCart',        'Toulouse',   'E-commerce','Solutions e-com headless',          'https://bluecart.example',   NULL,        '100-200', 'https://picsum.photos/id/1050/1200/300', NOW()),
(8,  'NeoBank',         'Paris',      'Fintech',   'Plateforme bancaire API-first',     'https://neobank.example',    NULL,        '200-500', 'https://picsum.photos/id/1057/1200/300', NOW()),
(9,  'MobilityX',       'Lille',      'Mobilité',  'Mobility-as-a-Service',             'https://mobilityx.example',  NULL,        '50-100',  'https://picsum.photos/id/1060/1200/300', NOW()),
(10, 'HealthHub',       'Rennes',     'Santé',     'SaaS pour cliniques',               'https://healthhub.example',  NULL,        '20-50',   'https://picsum.photos/id/1064/1200/300', NOW()),
(11, 'AgriSoft',        'Dijon',      'AgriTech',  'Data & IoT agricoles',              'https://agrisoft.example',   NULL,        '10-20',   'https://picsum.photos/id/1067/1200/300', NOW()),
(12, 'OrbitMedia',      'Nice',       'Médias',    'Plateforme vidéo',                  'https://orbitmedia.example', NULL,        '50-100',  'https://picsum.photos/id/1070/1200/300', NOW()),
(13, 'ByteWorks',       'Grenoble',   'Indus',     'Logiciels industriels',             'https://byteworks.example',  NULL,        '100-200', 'https://picsum.photos/id/1077/1200/300', NOW());

-- ---------- JOBS ----------
INSERT INTO jobs
(company_id, title, short_desc, full_desc, location, profile_sought, contract_type,
 work_mode, salary_min, salary_max, currency, tags, created_at)
VALUES
(1,  'Développeur Frontend',      'React + UI',                 'Frontend sur produit SaaS',                 'Paris',        'React/TS',           'CDI','hybrid', 35000, 45000, 'EUR', 'react,ui,js,tailwind', NOW()),
(2,  'Ingénieur Cloud',           'K8s + FinOps',               'Optimisation coûts cloud',                  'Lyon',         'Kubernetes',         'CDI','remote', 42000, 55000, 'EUR', 'k8s,cloud,finops,terraform', NOW()),
(3,  'Data Analyst',              'BI + SQL',                   'Analyses & reporting',                      'Nantes',       'SQL/Python',         'CDI','onsite', 38000, 48000, 'EUR', 'sql,bi,python,tableau', NOW()),
(4,  'Dev Fullstack',             'Node + Vue',                 'Projets web variés',                        'Bordeaux',     'JS/Node/Vue',        'CDD','hybrid', 32000, 42000, 'EUR', 'node,vue,fullstack,vitest', NOW()),
(5,  'Pentester',                 'AppSec',                     'Tests d’intrusion clients',                 'Marseille',    'Sécurité appli',     'CDI','remote', 45000, 60000, 'EUR', 'pentest,security,burp', NOW()),
(6,  'Product Designer',          'UX/UI système design',       'Design system & prototypage',               'Paris',        'Figma/DesignOps',    'CDI','hybrid', 38000, 52000, 'EUR', 'ux,ui,figma,accessibility', NOW()),
(7,  'SRE / DevOps',              'Infra as Code',              'SLO/SLA, observabilité',                    'Toulouse',     'K8s, Prometheus',    'CDI','hybrid', 45000, 62000, 'EUR', 'sre,observability,terraform', NOW()),
(8,  'Backend Java',              'Spring + SQL',               'API et microservices',                      'Grenoble',     'Java, Spring',       'CDI','onsite', 40000, 52000, 'EUR', 'java,spring,sql', NOW()),
(9,  'Data Scientist',            'ML classique',               'Modèles & mise en prod',                    'Rennes',       'Python, scikit',     'CDI','hybrid', 42000, 58000, 'EUR', 'ml,python,mlops', NOW()),
(10, 'QA Engineer',               'Automatisation tests',       'CI/CD et qualité logicielle',               'Angers',       'Cypress/Playwright', 'CDI','remote', 36000, 46000, 'EUR', 'qa,e2e,ci-cd', NOW()),
(11, 'Go Backend Engineer',       'Go + gRPC',                  'Services haute perf',                       'Clermont-Fd',  'Go, Kafka',          'CDI','hybrid', 45000, 65000, 'EUR', 'go,grpc,kafka', NOW()),
(12, 'Frontend Vue.js',           'SPA Vue 3',                  'Design system interne',                     'Metz',         'Vue, Pinia',         'CDI','remote', 35000, 47000, 'EUR', 'vue,spa,typescript', NOW()),
(1,  'PM / Product Manager',      'Discovery & Delivery',       'Driver la roadmap',                         'Paris',        'PM/Analytics',       'CDI','hybrid', 50000, 70000, 'EUR', 'product,ux,analytics', NOW()),
(6,  'Architecte Cloud',          'Azure/GCP',                  'Réf. technique cloud',                      'Toulouse',     'Cloud/Arch',         'CDI','hybrid', 60000, 80000, 'EUR', 'cloud,architecture,azure,gcp', NOW()),
(7,  'Ingénieur Sécurité',        'SOC/EDR',                    'Run sécurité + projets',                    'Paris',        'SIEM, EDR',          'CDI','onsite', 42000, 58000, 'EUR', 'soc,edr,siem', NOW()),
(8,  'Data Engineer',             'ETL/ELT',                    'Pipelines & dataware',                      'Lille',        'Airflow, DBT',       'CDI','hybrid', 45000, 62000, 'EUR', 'dataeng,airflow,dbt', NOW()),
(9,  'Fullstack TypeScript',      'Next.js + Nest',             'B2B dashboards',                            'Rennes',       'TS/React/Nest',      'CDI','remote', 42000, 59000, 'EUR', 'nextjs,nestjs,ts', NOW()),
(10, 'Chef de Projet IT',         'ERP/CRM',                    'Pilotage déploiements',                     'Dijon',        'Gestion projet',     'CDI','onsite', 38000, 50000, 'EUR', 'erp,crm,gestion', NOW()),
(11, 'Dev Mobile',                'Flutter',                    'Apps multi-plateformes',                    'Nice',         'Flutter/Dart',       'CDI','hybrid', 36000, 48000, 'EUR', 'flutter,mobile', NOW()),
(12, 'DataViz Engineer',          'D3.js',                      'Storytelling data',                         'Grenoble',     'D3.js/JS',           'CDI','remote', 38000, 52000, 'EUR', 'dataviz,d3js', NOW()),
(2,  'FinOps Engineer',           'Kost/Usage',                 'Optim cloud multi-accounts',                'Lyon',         'FinOps/K8s',         'CDI','remote', 47000, 65000, 'EUR', 'finops,k8s,cloud', NOW()),
(3,  'BI Developer',              'PowerBI/SQL',                'Modélisation & report',                     'Nantes',       'PowerBI/DAX',        'CDI','onsite', 36000, 46000, 'EUR', 'powerbi,dax,sql', NOW()),
(4,  'Tech Lead Front',           'React + DX',                 'Mentoring & qualité',                       'Bordeaux',     'React/Tooling',      'CDI','hybrid', 55000, 75000, 'EUR', 'react,webpack,testing', NOW()),
(5,  'AppSec Engineer',           'SDLC sécurité',              'Shift-left security',                       'Marseille',    'SAST/DAST',          'CDI','remote', 52000, 72000, 'EUR', 'appsec,devsecops', NOW()),
(6,  'UX Writer',                 'Contenu produit',            'Microcopy & guidelines',                    'Paris',        'UX writing',         'CDI','hybrid', 32000, 42000, 'EUR', 'ux,content,writing', NOW());

-- ---------- APPLICATIONS ----------
INSERT INTO applications
(job_id, user_id, name, email, phone, message, cv_url, status, matched_at, created_at)
VALUES
(1,  1,  NULL, NULL, NULL, 'Très motivée par le frontend !',       'https://cv.example/alice',       'matched', NOW(), NOW()),
(2,  2,  NULL, NULL, NULL, 'Expert K8s et optimisation cloud',      'https://cv.example/bob',         'review',  NULL,  NOW()),
(3,  NULL, 'Hugo Martin',   'hugo@mail.com',     '+33 6 12 34 56 78', 'Expérience BI et ETL',         NULL,      'new',     NULL,  NOW()),
(4,  4,  NULL, NULL, NULL, 'Fullstack JS depuis 2 ans',             'https://cv.example/diana',       'new',     NULL,  NOW()),
(5,  5,  NULL, NULL, NULL, 'Passionné sécurité, certif eJPT',       NULL,                             'review',  NULL,  NOW()),
(6,  10, NULL, NULL, NULL, 'Design system lover',                   'https://cv.example/julie',       'new',     NULL,  NOW()),
(7,  9,  NULL, NULL, NULL, 'Piloter la fiabilité me motive',        'https://cv.example/igor',        'matched', NOW(), NOW()),
(8,  11, NULL, NULL, NULL, 'Spring freak & SQL tuning',             'https://cv.example/kevin',       'review',  NULL,  NOW()),
(9,  8,  NULL, NULL, NULL, 'Passion modèles interprétables',        'https://cv.example/hannah',      'new',     NULL,  NOW()),
(10, 16, NULL, NULL, NULL, 'Je veux fiabiliser vos releases',       'https://cv.example/pauline',     'new',     NULL,  NOW()),
(11, 17, NULL, NULL, NULL, 'Go & perf : ma came',                   'https://cv.example/quentin',     'review',  NULL,  NOW()),
(12, 18, NULL, NULL, NULL, 'Vue 3, Pinia, tests à fond',            'https://cv.example/rachel',      'new',     NULL,  NOW()),
(13, 20, NULL, NULL, NULL, 'Orchestration de roadmap & KPI',        'https://cv.example/tess',        'new',     NULL,  NOW()),
(14, 9,  NULL, NULL, NULL, 'Infra cloud robuste by design',         'https://cv.example/igor',        'review',  NULL,  NOW()),
(15, 7,  NULL, NULL, NULL, 'Défense en profondeur & EDR',           'https://cv.example/georges',     'new',     NULL,  NOW()),
(16, 8,  NULL, NULL, NULL, 'ETL propres & data quality',            'https://cv.example/hannah',      'new',     NULL,  NOW()),
(17, 13, NULL, NULL, NULL, 'Stack TS complète maîtrisée',           'https://cv.example/marc',        'new',     NULL,  NOW()),
(18, 14, NULL, NULL, NULL, 'DataViz narrative & D3',                'https://cv.example/nina',        'review',  NULL,  NOW()),
(19, NULL,'Laura Petit',   'laura@mail.com',     '+33 6 98 76 54 32', 'FinOps certifiée, multi-cloud', 'https://cv.example/laura','new',     NULL,  NOW()),
(20, 3,  NULL, NULL, NULL, 'Modélisation BI pragmatique',           'https://cv.example/charlie',     'new',     NULL,  NOW()),
(21, 6,  NULL, NULL, NULL, 'DX et mentoring côté front',            'https://cv.example/fiona',       'review',  NULL,  NOW()),
(22, 19, NULL, NULL, NULL, 'AppSec et SDLC sécurisé',               'https://cv.example/samir',       'new',     NULL,  NOW()),
(23, NULL,'Julien R',      'julienr@mail.com',  '+33 6 77 66 55 44', 'Microcopy & guidelines',        NULL,      'new',     NULL,  NOW()),
(1,  12, NULL, NULL, NULL, 'SEO/Analytics côté front',              'https://cv.example/lea',         'new',     NULL,  NOW()),
(2,  15, NULL, NULL, NULL, 'Automatisation infra à l’échelle',      'https://cv.example/olivier',     'new',     NULL,  NOW()),
(3,  1,  NULL, NULL, NULL, 'Analyses ad hoc et SQL propre',         'https://cv.example/alice',       'review',  NULL,  NOW()),
(4,  5,  NULL, NULL, NULL, 'Fullstack JS, côté back ok',            'https://cv.example/eric',        'new',     NULL,  NOW()),
(5,  19, NULL, NULL, NULL, 'Pentest réseau/app, rapports clairs',   'https://cv.example/samir',       'new',     NULL,  NOW()),
(7,  15, NULL, NULL, NULL, 'SRE, SLO et budgets erreurs',           'https://cv.example/olivier',     'new',     NULL,  NOW()),
(16, NULL,'Isabelle K',    'isa.k@mail.com', '+33 6 61 62 63 64',    'Pipelines dbt & QA',             NULL,      'new',     NULL,  NOW()),
(19, 12, NULL, NULL, NULL, 'FinOps advisor hands-on',                'https://cv.example/lea',         'review',  NULL,  NOW());
;

-- (Optionnel) quelques bannières/avatars supplémentaires en dur si tu veux tester l’affichage pur :
-- UPDATE companies SET banner_url = 'https://via.placeholder.com/1200x300.png?text=Banner' WHERE id IN (1,2,3);
-- UPDATE profiles  SET avatar_url = 'https://via.placeholder.com/300.png?text=Avatar' WHERE user_id IN (1,2,3);


-- Vérifs rapides
SELECT COUNT(*) AS nb_users FROM users;
SELECT COUNT(*) AS nb_profiles FROM profiles;
SELECT COUNT(*) AS nb_companies FROM companies;
SELECT COUNT(*) AS nb_jobs FROM jobs;
SELECT COUNT(*) AS nb_applications FROM applications;

SELECT j.title, c.name AS company, j.location
FROM jobs j JOIN companies c ON j.company_id = c.id;

SELECT a.id, COALESCE(u.email,a.email) AS candidate, j.title AS job, a.status
FROM applications a
JOIN jobs j ON j.id = a.job_id
LEFT JOIN users u ON a.user_id = u.id;

-- Test pour images
UPDATE companies
SET banner_url = '../site/assets/logo-data-pulse.png'
WHERE name = 'DataPulse';
