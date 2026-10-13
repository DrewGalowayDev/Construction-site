-- ========================================================================
-- TopLineHub Construction Platform — Complete MySQL Database Schema & Seed
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ========================================================================

CREATE DATABASE IF NOT EXISTS `construction`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `construction`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('buyer', 'seller', 'artisan', 'admin') DEFAULT 'buyer',
  `county` VARCHAR(80) DEFAULT 'Nairobi',
  `town` VARCHAR(80) DEFAULT 'Nairobi',
  `avatar` VARCHAR(255) DEFAULT '/img/team-1.jpg',
  `is_verified` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: categories
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `type` ENUM('material', 'rental', 'service') DEFAULT 'material',
  `icon` VARCHAR(50) DEFAULT 'fa-cube',
  `description` TEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: products (Materials & Plant/Equipment Hire)
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `seller_id` INT DEFAULT NULL,
  `category_id` INT DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `price` DECIMAL(10, 2) NOT NULL,
  `unit` VARCHAR(50) DEFAULT 'item',
  `is_rental` TINYINT(1) DEFAULT 0,
  `stock_quantity` INT DEFAULT 100,
  `image_url` VARCHAR(255) DEFAULT '/img/service-1.jpg',
  `images` JSON DEFAULT NULL,
  `location_county` VARCHAR(80) DEFAULT 'Nairobi',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_seller` (`seller_id`),
  KEY `idx_products_category` (`category_id`),
  CONSTRAINT `fk_products_seller` FOREIGN KEY (`seller_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: artisan_profiles
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `artisan_profiles`;
CREATE TABLE `artisan_profiles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT DEFAULT NULL,
  `trade` VARCHAR(100) NOT NULL,
  `experience_years` INT DEFAULT 3,
  `daily_rate` DECIMAL(10, 2) DEFAULT 2000.00,
  `bio` TEXT,
  `nca_reg_number` VARCHAR(80) DEFAULT NULL,
  `is_available` TINYINT(1) DEFAULT 1,
  `rating` DECIMAL(2, 1) DEFAULT 5.0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_artisan_user` (`user_id`),
  CONSTRAINT `fk_artisan_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: job_posts (Client Construction Projects)
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `job_posts`;
CREATE TABLE `job_posts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `client_id` INT DEFAULT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `trade_required` VARCHAR(100) NOT NULL,
  `location_county` VARCHAR(80) NOT NULL,
  `location_town` VARCHAR(80) NOT NULL,
  `budget_estimate` DECIMAL(10, 2) NOT NULL,
  `duration` VARCHAR(100) DEFAULT '2 weeks',
  `status` ENUM('open', 'in_progress', 'completed', 'cancelled') DEFAULT 'open',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_jobs_client` (`client_id`),
  CONSTRAINT `fk_jobs_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: job_applications (Artisan Bids & Proposals)
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `job_applications`;
CREATE TABLE `job_applications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `job_id` INT DEFAULT NULL,
  `artisan_id` INT DEFAULT NULL,
  `bid_amount` DECIMAL(10, 2) NOT NULL,
  `pitch_message` TEXT NOT NULL,
  `status` ENUM('pending', 'shortlisted', 'accepted', 'rejected') DEFAULT 'pending',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bids_job` (`job_id`),
  KEY `idx_bids_artisan` (`artisan_id`),
  CONSTRAINT `fk_bids_job` FOREIGN KEY (`job_id`) REFERENCES `job_posts` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_bids_artisan` FOREIGN KEY (`artisan_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------
-- Table: order_requests (Material Supply Quotes & Orders)
-- ------------------------------------------------------------------------
DROP TABLE IF EXISTS `order_requests`;
CREATE TABLE `order_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `buyer_id` INT DEFAULT NULL,
  `product_id` INT DEFAULT NULL,
  `quantity` INT DEFAULT 1,
  `total_price` DECIMAL(10, 2) NOT NULL,
  `delivery_address` VARCHAR(255) NOT NULL,
  `contact_phone` VARCHAR(30) NOT NULL,
  `notes` TEXT,
  `status` ENUM('inquiry', 'quote_provided', 'confirmed', 'delivered', 'cancelled') DEFAULT 'inquiry',
  `payment_status` VARCHAR(20) DEFAULT 'unpaid',
  `mpesa_receipt` VARCHAR(50) DEFAULT NULL,
  `mpesa_phone` VARCHAR(30) DEFAULT NULL,
  `paid_at` DATETIME DEFAULT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'paystack',
  `paystack_reference` VARCHAR(100) DEFAULT NULL,
  `platform_fee` DECIMAL(10, 2) DEFAULT 0.00,
  `seller_payout_amount` DECIMAL(10, 2) DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_buyer` (`buyer_id`),
  KEY `idx_orders_product` (`product_id`),
  CONSTRAINT `fk_orders_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_orders_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================
-- Seed Data (Kenyan Construction Context)
-- ========================================================================

-- Categories
INSERT INTO `categories` (`id`, `name`, `slug`, `type`, `icon`, `description`, `created_at`, `updated_at`) VALUES
(1, 'Cement & Binding', 'cement-binding', 'material', 'fa-cubes', 'Portland cement, lime, tile adhesive & structural grouts', NOW(), NOW()),
(2, 'Steel & Metal Works', 'steel-metals', 'material', 'fa-grip-lines-vertical', 'BRC mesh, deformed rebar bars D8/D10/D12/D16, binding wire', NOW(), NOW()),
(3, 'Sand, Stones & Ballast', 'sand-stones-ballast', 'material', 'fa-mountain', 'River sand, machine-cut quarry stones, 3/4 ballast tippers', NOW(), NOW()),
(4, 'Timber & Formwork', 'timber-formwork', 'material', 'fa-tree', 'Bluegum props, cypress timber, marine plywood boards', NOW(), NOW()),
(5, 'Roofing & Gutters', 'roofing-materials', 'material', 'fa-home', 'Box profile mabati, stone-coated tiles, ridging & valley rolls', NOW(), NOW()),
(6, 'Plumbing & Drainage', 'plumbing-drainage', 'material', 'fa-faucet', 'PPR pipes, HDPE coils, septic tanks, water storage tanks', NOW(), NOW()),
(7, 'Electrical & Solar', 'electrical-solar', 'material', 'fa-bolt', 'Single & twin core copper cables, consumer units, conduits', NOW(), NOW()),
(8, 'Equipment & Plant Hire', 'equipment-hire', 'rental', 'fa-tools', 'Concrete mixers, poker vibrators, scaffolding, compactors', NOW(), NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Demo Users (Passwords hashed for: AdminPassword123!, VendorPassword123!, ArtisanPassword123!, ClientPassword123!)
-- Hash: $2a$10$Ocg1q9V5iZ2uS1J0gUqNTe9kG8y2nUfL6H8jPqR7vS9wT0yU1z2.a (or seed bcrypt compatible)
INSERT INTO `users` (`id`, `name`, `email`, `phone`, `password`, `role`, `county`, `town`, `avatar`, `is_verified`, `created_at`, `updated_at`) VALUES
(1, 'TopLineHub Admin', 'admin@toplinehub.co.ke', '+254711000000', '$2a$10$Wq2H1kYgVvA1b.mF2P8uG.U1oXb4R3YhJ8v5n2N0mK7l9p4Q6s8Ta', 'admin', 'Nairobi', 'CBD', '/img/team-1.jpg', 1, NOW(), NOW()),
(2, 'Nairobi Builders Hardware', 'sales@nairobibuilders.co.ke', '+254722112233', '$2a$10$Wq2H1kYgVvA1b.mF2P8uG.U1oXb4R3YhJ8v5n2N0mK7l9p4Q6s8Ta', 'seller', 'Nairobi', 'Industrial Area', '/img/service-1.jpg', 1, NOW(), NOW()),
(3, 'Apex Plant & Equipment Hire', 'rentals@apexplant.co.ke', '+254733445566', '$2a$10$Wq2H1kYgVvA1b.mF2P8uG.U1oXb4R3YhJ8v5n2N0mK7l9p4Q6s8Ta', 'seller', 'Kiambu', 'Ruiru', '/img/service-2.jpg', 1, NOW(), NOW()),
(4, 'John Mwangi', 'john.mason@toplinehub.co.ke', '+254799887766', '$2a$10$Wq2H1kYgVvA1b.mF2P8uG.U1oXb4R3YhJ8v5n2N0mK7l9p4Q6s8Ta', 'artisan', 'Kiambu', 'Thika / Ruiru', '/img/team-1.jpg', 1, NOW(), NOW()),
(5, 'Peter Omondi', 'peter.electric@toplinehub.co.ke', '+254788112244', '$2a$10$Wq2H1kYgVvA1b.mF2P8uG.U1oXb4R3YhJ8v5n2N0mK7l9p4Q6s8Ta', 'artisan', 'Nairobi', 'Westlands', '/img/team-2.jpg', 1, NOW(), NOW()),
(6, 'Grace Wanjiku', 'grace.client@toplinehub.co.ke', '+254720998877', '$2a$10$Wq2H1kYgVvA1b.mF2P8uG.U1oXb4R3YhJ8v5n2N0mK7l9p4Q6s8Ta', 'buyer', 'Machakos', 'Syokimau', '/img/team-3.jpg', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Artisan Profiles
INSERT INTO `artisan_profiles` (`id`, `user_id`, `trade`, `experience_years`, `daily_rate`, `bio`, `nca_reg_number`, `is_available`, `rating`, `created_at`, `updated_at`) VALUES
(1, 4, 'Master Mason / Bricklayer', 12, 2500.00, 'NCA certified lead mason with 12+ years experience in multi-storey residential projects, foundation stone dressing, and boundary wall masonry.', 'NCA-ART-88421', 1, 4.9, NOW(), NOW()),
(2, 5, 'Certified Electrician & Solar Tech', 8, 2200.00, 'EPRA Class B licensed electrical installer. Conduiting, single & three-phase wiring, consumer unit setup, and site solar power.', 'EPRA-ELEC-4421', 1, 4.8, NOW(), NOW())
ON DUPLICATE KEY UPDATE `trade`=VALUES(`trade`);

-- Products (Materials & Rentals)
INSERT INTO `products` (`id`, `seller_id`, `category_id`, `title`, `slug`, `description`, `price`, `unit`, `is_rental`, `stock_quantity`, `image_url`, `location_county`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 2, 1, 'Bamburi Tembo Cement (32.5R)', 'bamburi-tembo-cement-50kg', 'High performance general purpose cement ideal for bricklaying, plastering, structural mortars, and non-structural concretes.', 780.00, '50kg Bag', 0, 500, '/img/service-1.jpg', 'Nairobi', 1, NOW(), NOW()),
(2, 2, 2, 'D12 Deformed Steel Rebar (High Yield BS4449)', 'd12-deformed-steel-rebar', 'Standard 12mm high yield ribbed steel reinforcement bar for columns, beams, ring beams, and foundation footings.', 1540.00, '12m Length', 0, 200, '/img/service-4.jpg', 'Nairobi', 1, NOW(), NOW()),
(3, 2, 5, 'Box Profile Mabati 30-Gauge (Charcoal Grey)', 'box-profile-mabati-30g-charcoal', 'Gloss finish corrosion-resistant corrugated roofing sheets with UV-resistant acrylic coat, 2.5m, 3.0m, and custom lengths.', 890.00, 'Meter', 0, 350, '/img/service-3.jpg', 'Kiambu', 1, NOW(), NOW()),
(4, 3, 8, 'Diesel Concrete Mixer 400L (With Hopper)', 'diesel-concrete-mixer-400l', 'Heavy duty Yanmar diesel engine powered reversible drum mixer. High throughput batching for site slabs and footings. Includes operator.', 4500.00, 'Per Day', 1, 4, '/img/service-2.jpg', 'Kiambu', 1, NOW(), NOW()),
(5, 3, 8, 'Steel Tubular Scaffolding Frame Set (6-Meter Tower)', 'steel-scaffolding-frame-tower', 'Certified heavy steel scaffold kit including 4 H-frames, cross braces, base jacks, and safety walk boards.', 1200.00, 'Per Day', 1, 25, '/img/service-6.jpg', 'Nairobi', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Job Posts
INSERT INTO `job_posts` (`id`, `client_id`, `title`, `description`, `trade_required`, `location_county`, `location_town`, `budget_estimate`, `duration`, `status`, `created_at`, `updated_at`) VALUES
(1, 6, 'Foundation Masonry for 4-Bedroom Maisonette', 'Looking for an experienced lead mason with a crew of 4 to lay machine-cut stone foundation up to DPC level. Trench concrete already cast.', 'Mason / Bricklayer', 'Machakos', 'Syokimau', 85000.00, '2 weeks', 'open', NOW(), NOW()),
(2, 6, 'Complete First-Fix Electrical Conduiting', 'Concealed PVC pipe laying and metal back-box installation for ongoing residential slab and brick partitions.', 'Certified Electrician', 'Machakos', 'Syokimau', 45000.00, '10 days', 'open', NOW(), NOW())
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Sample Bid Proposal
INSERT INTO `job_applications` (`id`, `job_id`, `artisan_id`, `bid_amount`, `pitch_message`, `status`, `created_at`, `updated_at`) VALUES
(1, 1, 4, 80000.00, 'I have 12 years of structural masonry experience with NCA registration. I can deploy a vetted team of 4 masons and 6 laborers starting Monday. Quality stone dressing guaranteed.', 'shortlisted', NOW(), NOW())
ON DUPLICATE KEY UPDATE `bid_amount`=VALUES(`bid_amount`);
