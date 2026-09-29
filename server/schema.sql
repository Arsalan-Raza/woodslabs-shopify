-- Run this once after creating your Railway MySQL database
-- Creates the slab_pricing table with lookup index

CREATE TABLE IF NOT EXISTS slab_pricing (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    material      VARCHAR(20)    NOT NULL,
    finish        VARCHAR(12)    NOT NULL,
    product_type  VARCHAR(8)     NOT NULL,
    hardware      VARCHAR(3)     NOT NULL,
    thickness     VARCHAR(8)     NOT NULL,
    depth         VARCHAR(10)    NOT NULL,
    width_inches  TINYINT        NOT NULL,
    price         DECIMAL(10,2)  NOT NULL,
    placeholder   CHAR(3)        NOT NULL DEFAULT 'no',
    INDEX idx_lookup (material, finish, product_type, hardware, thickness, depth, width_inches)
);
